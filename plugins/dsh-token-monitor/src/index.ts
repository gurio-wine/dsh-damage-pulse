/**
 * dsh-damage-pulse —— 用扣血动画呈现 Token 消耗的 DeepSeek Harness 余额监控插件。
 *
 * M1：Host 采集器 —— 监听 session/event，累计每次模型调用的 token 与金额。
 * M2：余额查询服务 —— 复用 ctx.credentials 取 key，定时轮询 DeepSeek /user/balance。
 * M3：tokenCost projection —— 经 session-projection 把会话累计 token/金额推送到 Web Client。
 * M4：Web Client UI（Conversation Node 用量行 + 会话统计条 + 余额卡片）。
 * M6：单次用量明细持久化 + 历史查询端点。
 *
 * @module dsh-token-monitor
 */

import type { Context } from '@deepseek-ai/cordis'
import { readFile } from 'node:fs/promises'
import z from '@deepseek-ai/schemastery'
import { settingsNamespace } from '@deepseek-ai/dsh-settings'
// Type-only：触发 ctx.sessionProjections 的 Context 声明合并。
import type {} from '@deepseek-ai/dsh-session-projection'
// Type-only：触发 ctx.sessionProjectionCache / ctx.sessionPersistence 的 Context 声明合并。
import type {} from '@deepseek-ai/dsh-session-projection-cache'
import type {} from '@deepseek-ai/dsh-session-persistence'
// Type-only：触发 ctx.webServer 的 Context 声明合并。
import type {} from '@deepseek-ai/dsh-host-webserver'
import { attachCollector } from './collector.ts'
import { attachBalance, registerBalanceRoute } from './balance.ts'
import { chargesSince, currentChargeSeq } from './charge.ts'
import { createTokenCostProjectionDefinition } from './projection.ts'
import { PRICE_TABLE, type PricingTable } from './pricing.ts'
import { UsageStorage } from './storage.ts'

export const name = 'dsh-token-monitor'
export const inject = ['sessions', 'credentials']

const SETTINGS_NS = settingsNamespace('dsh-token-monitor')

const WHALE_ASSET_ROUTE = '/assets/dsh-token-monitor/whale-girl'
const WHALE_ASSET_PATHS = new Set([
  ...['acting-01', 'acting-02', 'acting-03', 'acting-04', 'acting-05', 'acting-06', 'acting-07', 'acting-08',
    'blink-half-close', 'blink-soft', 'blink-reopen', 'idle-01', 'idle-02', 'idle-03', 'idle-04', 'idle-05', 'idle-06', 'idle-07', 'idle-08']
    .map((name) => `idle-v4-r2/${name}.png`),
  ...['weak-half', 'weak-close', 'weak-reopen', 'normal-half', 'normal-close', 'normal-reopen',
    'critical-half', 'critical-close', 'critical-reopen']
    .map((name) => `feedback-expression-v4-r4-model/frames/${name}.png`),
  ...['notice', 'brace', 'peak', 'overflow', 'comfort', 'recover']
    .map((name) => `feedback-expression-v4-r5-critical-model/frames/critical-${name}.png`),
  ...['revive-death-start', 'revive-wake', 'revive-lift', 'revive-relief', 'revive-hop', 'revive-settle', 'revive-reopen']
    .map((name) => `revive-recharge-v1/frames/${name}.png`),
  'death-stranded-v6-trim.png',
])

export function registerWhaleAssetRoute(ctx: Context): void {
  ctx.webServer.register({
    kind: 'prefix',
    path: WHALE_ASSET_ROUTE,
    handler: async (req, res) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, { Allow: 'GET, HEAD', 'Cache-Control': 'no-store' })
        res.end()
        return
      }
      let pathname: string
      try {
        pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname)
      } catch {
        res.writeHead(400, { 'Cache-Control': 'no-store' })
        res.end()
        return
      }
      const relativePath = pathname.startsWith(`${WHALE_ASSET_ROUTE}/`)
        ? pathname.slice(WHALE_ASSET_ROUTE.length + 1)
        : ''
      if (!WHALE_ASSET_PATHS.has(relativePath)) {
        res.writeHead(404, { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' })
        res.end()
        return
      }
      try {
        const body = await readFile(new URL(`../assets/dsh-token-monitor/whale-girl/${relativePath}`, import.meta.url))
        res.writeHead(200, {
          'Content-Type': 'image/png',
          'Content-Length': body.byteLength,
          'Cache-Control': 'public, max-age=31536000, immutable',
          'X-Content-Type-Options': 'nosniff',
        })
        res.end(req.method === 'HEAD' ? undefined : body)
      } catch {
        res.writeHead(404, { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' })
        res.end()
      }
    },
  })
}

/** 用户可编辑设置：价格表可覆盖（宽松 any，默认 PRICE_TABLE）。 */
const settingsSchema = z.object({
  priceTable: z.any().default(PRICE_TABLE),
})

/**
 * 为缺失 tokenCost 投影的历史会话触发冷读重新 fold（一次性补齐，异步不阻塞启动）。
 * 冷读会自动写回 checkpoint，之后列表读即可看到金额。
 */
async function migrateMissingTokenCost(ctx: Context): Promise<void> {
  try {
    const headers = await ctx.sessionPersistence.list()
    let migrated = 0
    for (const header of headers) {
      const cached = ctx.sessionProjectionCache.cachedSnapshot(header)
      if (cached?.values.tokenCost !== undefined) continue
      await ctx.sessionProjectionCache.coldSnapshot(header.id)
      migrated++
    }
    if (migrated > 0) {
      console.log(`[dsh-damage-pulse] 已为 ${migrated} 个历史会话重建 tokenCost 投影`)
    }
  } catch (error) {
    console.warn(`[dsh-damage-pulse] 历史会话投影迁移失败: ${String(error)}`)
  }
}

export function apply(ctx: Context) {
  console.log('[dsh-damage-pulse] plugin loaded')

  // 价格表：settings 可覆盖，启动时读取一次（改后需重启生效）。
  // settings 在 web 装配里先于本插件就绪，故 inject 回调同步执行。
  let priceTable: PricingTable = PRICE_TABLE
  ctx.inject(['settings'], (settingsCtx) => {
    const scope = settingsCtx.settings.register(SETTINGS_NS, settingsSchema)
    const section = scope.get() as { priceTable?: PricingTable } | undefined
    if (section?.priceTable !== undefined) {
      priceTable = section.priceTable
      console.log(`[dsh-damage-pulse] 使用 settings 价格表 v${priceTable.version}`)
    }
  })

  const storage = new UsageStorage()
  attachCollector(ctx, storage, priceTable)
  const balance = attachBalance(ctx)

  // 条件注册 tokenCost projection：仅当组合树提供了 sessionProjections 服务时生效。
  ctx.inject(['sessionProjections'], (projectionCtx) => {
    projectionCtx.sessionProjections.register(createTokenCostProjectionDefinition(priceTable))
    console.log('[dsh-damage-pulse] tokenCost projection registered')
  })

  // 同步迁移：依赖 sessionProjections（确保 tokenCost 已注册）+ 缓存 + 持久化，
  // await 完成，保证在 Client 首次列表读之前补齐历史会话的 tokenCost。
  ctx.inject(['sessionProjections', 'sessionProjectionCache', 'sessionPersistence'], async (migrateCtx) => {
    await migrateMissingTokenCost(migrateCtx)
  })

  // 条件注册余额/用量明细 HTTP 端点：仅 web 装配有 webServer 服务。
  ctx.inject(['webServer'], (webCtx) => {
    registerWhaleAssetRoute(webCtx)
    console.log('[dsh-damage-pulse] whale asset route registered')
    registerBalanceRoute(webCtx, balance)
    console.log('[dsh-damage-pulse] balance route registered')

    // 用量明细历史查询端点（可按 sessionId 过滤）。
    webCtx.webServer.register({
      kind: 'exact',
      path: '/api/token-monitor/usage',
      handler: (req, res) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        const sessionId = url.searchParams.get('sessionId') ?? undefined
        const records = storage.history(sessionId)
        res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
        res.end(JSON.stringify(records))
      },
    })
    console.log('[dsh-damage-pulse] usage route registered')

    // 扣费事件增量拉取端点（since=seq，返回严格大于 seq 的扣费），供余额卡片实时扣减 + 扣血动画。
    webCtx.webServer.register({
      kind: 'exact',
      path: '/api/token-monitor/charge-events',
      handler: (req, res) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        const since = Number(url.searchParams.get('since') ?? 0)
        const events = chargesSince(since)
        res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
        res.end(JSON.stringify({ seq: currentChargeSeq(), events }))
      },
    })
    console.log('[dsh-damage-pulse] charge-events route registered')
  })
}

/**
 * DeepSeek 账户余额查询服务。
 * @module dsh-token-monitor/balance
 */

import type { Context } from '@deepseek-ai/cordis'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
// Type-only：触发 ctx.webServer 的 Context 声明合并。
import type {} from '@deepseek-ai/dsh-host-webserver'
import type { BalanceInfo } from './types.ts'

const DEEPSEEK_API_KEY = credentialRef('DEEPSEEK_API_KEY')
const BALANCE_URL = 'https://api.deepseek.com/user/balance'

/** DeepSeek /user/balance 原始响应（金额字段为字符串）。 */
interface BalanceResponse {
  is_available?: boolean
  balance_infos?: Array<{
    currency?: string
    total_balance?: string
    granted_balance?: string
    topped_up_balance?: string
  }>
}

/** 从 ctx.credentials 解析 DeepSeek API key（每操作重新解析，遵循凭据热更新约定）。 */
export async function resolveApiKey(ctx: Context): Promise<string | undefined> {
  const resolved = await ctx.credentials.resolve(DEEPSEEK_API_KEY)
  return resolved?.value
}

/** 查询一次 DeepSeek 账户余额。 */
export async function fetchBalance(apiKey: string): Promise<BalanceInfo> {
  const res = await fetch(BALANCE_URL, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw new Error(`balance HTTP ${res.status}`)
  const json = (await res.json()) as BalanceResponse
  const info = json.balance_infos?.[0]
  return {
    currency: info?.currency ?? 'CNY',
    totalBalance: Number(info?.total_balance ?? 0),
    grantedBalance: Number(info?.granted_balance ?? 0),
    toppedUpBalance: Number(info?.topped_up_balance ?? 0),
    isAvailable: json.is_available !== false,
    updatedAt: Date.now(),
  }
}

/** 余额服务：定时轮询 + 缓存最新值。 */
export class BalanceService {
  private latest: BalanceInfo | undefined
  private timer: ReturnType<typeof setInterval> | undefined
  private warnedMissingKey = false
  private lastLoggedTotal: number | undefined

  constructor(
    private readonly ctx: Context,
    private readonly pollMs = 60_000,
  ) {}

  /** 查询并缓存最新余额；失败只告警不抛。 */
  async refresh(): Promise<BalanceInfo | undefined> {
    const apiKey = await resolveApiKey(this.ctx)
    if (apiKey === undefined) {
      // 未配置只告警一次，避免每次轮询刷屏。
      if (!this.warnedMissingKey) {
        console.warn('[dsh-token-monitor] 未配置 DEEPSEEK_API_KEY，余额卡片将显示未配置态')
        this.warnedMissingKey = true
      }
      return undefined
    }
    try {
      const next = await fetchBalance(apiKey)
      this.latest = next
      // 成功日志只在余额变化时打印，避免 60s 轮询刷屏。
      if (this.lastLoggedTotal !== next.totalBalance) {
        this.lastLoggedTotal = next.totalBalance
        console.log(
          `[dsh-token-monitor] 余额 ${next.currency} ${next.totalBalance.toFixed(2)} ` +
            `(赠送 ${next.grantedBalance.toFixed(2)} / 充值 ${next.toppedUpBalance.toFixed(2)})`,
        )
      }
      return next
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`[dsh-token-monitor] 余额查询失败: ${message}`)
      return undefined
    }
  }

  get(): BalanceInfo | undefined {
    return this.latest
  }

  /** 启动轮询：立即查一次，之后每 pollMs 一次。 */
  start(): void {
    void this.refresh()
    this.timer = setInterval(() => void this.refresh(), this.pollMs)
  }

  stop(): void {
    if (this.timer !== undefined) {
      clearInterval(this.timer)
      this.timer = undefined
    }
  }
}

/** 挂载余额服务：启动轮询，fiber dispose 时清理定时器。 */
export function attachBalance(ctx: Context): BalanceService {
  const service = new BalanceService(ctx)
  ctx.effect(() => {
    service.start()
    return () => service.stop()
  }, 'dsh-token-monitor balance polling')
  return service
}

/** 注册余额 HTTP 端点（仅 web 装配有 webServer 服务）：Client 余额卡片定时拉取。 */
export function registerBalanceRoute(ctx: Context, service: BalanceService): void {
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/token-monitor/balance',
    handler: (_req, res) => {
      const balance = service.get()
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
      res.end(JSON.stringify(balance ?? null))
    },
  })
}

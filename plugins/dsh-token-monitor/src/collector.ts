/**
 * Token 用量采集器：监听 session/event，取 assistant/message.usage 精确记账。
 * @module dsh-token-monitor/collector
 */

import type { Context } from '@deepseek-ai/cordis'
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'
import type { TokenUsage } from '@deepseek-ai/dsh-llm'
import { priceUsage, type PricingTable } from './pricing.ts'
import { recordCharge } from './charge.ts'
import type { TokenUsageRecordData, UsageRecord } from './types.ts'
import { UsageStorage } from './storage.ts'

/** 把一条 assistant/message 的 usage 转成 UsageRecord。 */
function buildRecord(
  sessionId: string,
  turn: number,
  step: number,
  timestamp: number,
  provider: string,
  model: string,
  usage: TokenUsage,
  priceTable: PricingTable,
): UsageRecord {
  const inputTokens = usage.inputTokens
  const cacheReadTokens = usage.cacheReadTokens ?? 0
  const cacheWriteTokens = usage.cacheWriteTokens ?? 0
  const outputTokens = usage.outputTokens
  const breakdown = priceUsage(inputTokens, cacheReadTokens, cacheWriteTokens, outputTokens, model, timestamp, priceTable)
  return {
    sessionId,
    turn,
    step,
    timestamp,
    provider,
    model,
    inputTokens,
    cacheReadTokens,
    cacheWriteTokens,
    outputTokens,
    reasoningTokens: usage.reasoningTokens ?? 0,
    costInput: breakdown.costInput,
    costCache: breakdown.costCache,
    costCacheRead: breakdown.costCacheRead,
    costCacheWrite: breakdown.costCacheWrite,
    costOutput: breakdown.costOutput,
    cost: breakdown.cost,
    peak: breakdown.peak,
  }
}

/** 挂载采集器：监听 session/event，累计每次模型调用的 token 与金额。 */
export function attachCollector(ctx: Context, storage: UsageStorage, priceTable: PricingTable): void {
  ctx.on('session/event', (session: Session, event: SessionEvent) => {
    if (event.type !== 'assistant/message') return
    const usage = event.data.usage
    if (usage === undefined) return
    const source = event.data.message.source
    if (source.kind !== 'model') return

    const record = buildRecord(
      session.id,
      event.data.turn,
      event.data.step,
      event.time,
      source.provider,
      source.model,
      usage,
      priceTable,
    )
    storage.add(record)

    // 缓存未命中输入或缓存写入均按未命中处理；纯缓存读取使用普通动画。
    const damageKind = record.inputTokens > 0 || record.cacheWriteTokens > 0 ? 'miss' : 'normal'
    recordCharge(record.cost, record.timestamp, damageKind, {
      cacheHit: { tokens: record.cacheReadTokens, cost: record.costCacheRead },
      cacheMiss: { tokens: record.inputTokens + record.cacheWriteTokens, cost: record.costInput + record.costCacheWrite },
      output: { tokens: record.outputTokens, cost: record.costOutput },
    })

    // 追加「单次用量」仅日志事件，供 Web Client 回放渲染单次用量行（F1）。
    // 仅日志事件不进模型 surface，非 SurfaceEventType 只需 (type, data)。
    session.append('token-usage/record', { record } satisfies TokenUsageRecordData)
  })
}

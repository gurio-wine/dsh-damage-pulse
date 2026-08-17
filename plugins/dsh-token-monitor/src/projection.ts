/**
 * tokenCost projection：fold assistant/message.usage，累计每个会话的 token 用量与金额。
 * 经 session-projection 缝自动推送（registry 快照 / 变更流 / session/projection 帧），
 * Web Client 据此渲染「会话累计」统计条。
 * @module dsh-token-monitor/projection
 */

import { z } from 'zod'
import type { ProjectionDefinition } from '@deepseek-ai/dsh-session-projection'
import { priceUsage, type PricingTable } from './pricing.ts'
import type { TokenCostProjection } from './types.ts'

/** 内部 fold 状态（plain JSON）。 */
interface TokenCostState {
  calls: number
  inputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  outputTokens: number
  cost: number
  lastActivity: number
}

const schema = z.object({
  calls: z.number().int().nonnegative(),
  inputTokens: z.number().int().nonnegative(),
  cacheReadTokens: z.number().int().nonnegative(),
  cacheWriteTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
  cost: z.number().nonnegative(),
  lastActivity: z.number().nonnegative(),
}).strict()

/** 按给定价格表构造 tokenCost projection 单元。 */
export function createTokenCostProjectionDefinition(
  priceTable: PricingTable,
): ProjectionDefinition<'tokenCost', TokenCostState> {
  return {
    key: 'tokenCost',
    schema,
    init: () => ({
      calls: 0,
      inputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      outputTokens: 0,
      cost: 0,
      lastActivity: 0,
    }),
    apply: (state, event) => {
      if (event.type !== 'assistant/message') return state
      const usage = event.data.usage
      if (usage === undefined) return state
      const source = event.data.message.source
      if (source.kind !== 'model') return state

      const inputTokens = usage.inputTokens
      const cacheReadTokens = usage.cacheReadTokens ?? 0
      const cacheWriteTokens = usage.cacheWriteTokens ?? 0
      const outputTokens = usage.outputTokens
      const breakdown = priceUsage(
        inputTokens,
        cacheReadTokens,
        cacheWriteTokens,
        outputTokens,
        source.model,
        event.time,
        priceTable,
      )

      return {
        ...state,
        calls: state.calls + 1,
        inputTokens: state.inputTokens + inputTokens,
        cacheReadTokens: state.cacheReadTokens + cacheReadTokens,
        cacheWriteTokens: state.cacheWriteTokens + cacheWriteTokens,
        outputTokens: state.outputTokens + outputTokens,
        cost: state.cost + breakdown.cost,
        lastActivity: event.time,
      }
    },
    view: (state): TokenCostProjection => ({
      calls: state.calls,
      inputTokens: state.inputTokens,
      cacheReadTokens: state.cacheReadTokens,
      cacheWriteTokens: state.cacheWriteTokens,
      outputTokens: state.outputTokens,
      totalTokens: state.inputTokens + state.cacheReadTokens + state.cacheWriteTokens + state.outputTokens,
      cost: state.cost,
      lastActivity: state.lastActivity,
    }),
    // v1 累计了错误的「8-17 新价格」金额；v2 按时间戳切换旧/新价格，强制缓存失效重 fold。
    stateVersion: 2,
  }
}

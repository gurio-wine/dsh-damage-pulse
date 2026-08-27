import { describe, expect, it } from 'vitest'
import { summarizeUsage, type UsageSummaryRange } from '../src/usage-summary.ts'
import type { UsageRecord } from '../src/types.ts'

const NOW = Date.parse('2026-08-24T04:00:00.000Z')

function record(
  date: string,
  { cost, inputTokens, outputTokens, cacheReadTokens }: {
    cost: number
    inputTokens: number
    outputTokens: number
    cacheReadTokens: number
  },
): UsageRecord {
  return {
    sessionId: `session-${date}`,
    turn: 1,
    step: 1,
    timestamp: Date.parse(`${date}T04:00:00.000Z`),
    provider: 'deepseek-official',
    model: 'deepseek-chat',
    inputTokens,
    cacheReadTokens,
    cacheWriteTokens: 0,
    outputTokens,
    reasoningTokens: 0,
    costInput: 0,
    costCache: 0,
    costCacheRead: 0,
    costCacheWrite: 0,
    costOutput: 0,
    cost,
    peak: false,
  }
}

const HISTORY = [
  record('2026-07-01', { cost: 0.25, inputTokens: 100, outputTokens: 20, cacheReadTokens: 40 }),
  record('2026-08-18', { cost: 0.75, inputTokens: 200, outputTokens: 30, cacheReadTokens: 80 }),
  record('2026-08-24', { cost: 1.5, inputTokens: 300, outputTokens: 50, cacheReadTokens: 120 }),
]

describe('usage summary', () => {
  it('uses persisted historical cost and the earliest eligible record for all history', () => {
    expect(summarizeUsage(HISTORY, 'all', NOW)).toEqual({
      range: 'all',
      from: '2026-07-01',
      to: '2026-08-24',
      spendCny: 2.5,
      requestCount: 3,
      totalTokens: 940,
      cacheHitTokens: 240,
      cacheHitRate: 240 / 840,
      activeDays: 3,
    })
  })

  it.each([
    ['today', '2026-08-24', 1, 1.5],
    ['7d', '2026-08-18', 2, 2.25],
    ['30d', '2026-07-26', 2, 2.25],
  ] as const)('applies the inclusive %s Beijing date range', (range, from, requestCount, spendCny) => {
    expect(summarizeUsage(HISTORY, range, NOW)).toMatchObject({
      range, from, to: '2026-08-24', requestCount, spendCny,
    })
  })

  it('counts uncached input, cache reads, cache writes, and output without double-counting reasoning', () => {
    const result = summarizeUsage([
      record('2026-08-24', { cost: 1, inputTokens: 80, outputTokens: 20, cacheReadTokens: 20 }),
    ], 'today', NOW)
    expect(result).toMatchObject({ totalTokens: 120, cacheHitTokens: 20, cacheHitRate: 0.2 })

    const withCacheWrite = record('2026-08-24', { cost: 1, inputTokens: 80, outputTokens: 20, cacheReadTokens: 20 })
    withCacheWrite.cacheWriteTokens = 10
    expect(summarizeUsage([withCacheWrite], 'today', NOW)).toMatchObject({
      totalTokens: 130,
      cacheHitTokens: 20,
      cacheHitRate: 0.2,
    })
  })

  it('ignores invalid and future records', () => {
    const invalid = record('2026-08-24', { cost: -1, inputTokens: 10, outputTokens: 5, cacheReadTokens: 2 })
    const future = record('2026-08-25', { cost: 999, inputTokens: 999, outputTokens: 999, cacheReadTokens: 999 })
    expect(summarizeUsage([...HISTORY, invalid, future], 'all', NOW)).toMatchObject({
      from: '2026-07-01',
      to: '2026-08-24',
      spendCny: 2.5,
      requestCount: 3,
    })
  })

  it('returns stable zero values for an empty range', () => {
    expect(summarizeUsage([], 'today', NOW)).toEqual({
      range: 'today',
      from: null,
      to: '2026-08-24',
      spendCny: 0,
      requestCount: 0,
      totalTokens: 0,
      cacheHitTokens: 0,
      cacheHitRate: 0,
      activeDays: 0,
    })
  })

  it('rejects an unsupported range at the aggregation boundary', () => {
    expect(summarizeUsage(HISTORY, '90d' as UsageSummaryRange, NOW)).toBeUndefined()
  })
})

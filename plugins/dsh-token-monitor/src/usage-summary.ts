import type { UsageRecord } from './types.ts'

export type UsageSummaryRange = 'all' | '30d' | '7d' | 'today'

export interface UsageSummary {
  range: UsageSummaryRange
  from: string | null
  to: string
  spendCny: number
  requestCount: number
  totalTokens: number
  cacheHitTokens: number
  cacheHitRate: number
  activeDays: number
}

const BEIJING_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

function beijingDate(timestamp: number): string | undefined {
  if (!Number.isFinite(timestamp)) return undefined
  const parts = BEIJING_DATE_FORMATTER.formatToParts(timestamp)
  const values = Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]))
  if (typeof values.year !== 'string' || typeof values.month !== 'string' || typeof values.day !== 'string') return undefined
  return `${values.year}-${values.month}-${values.day}`
}

function beijingToday(timestamp: number): string {
  return beijingDate(timestamp) ?? '1970-01-01'
}

function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number)
  const utc = Date.UTC(year, month - 1, day + days)
  const shifted = new Date(utc)
  return `${shifted.getUTCFullYear().toString().padStart(4, '0')}-${(shifted.getUTCMonth() + 1).toString().padStart(2, '0')}-${shifted.getUTCDate().toString().padStart(2, '0')}`
}

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isValidRecord(record: UsageRecord): boolean {
  return Number.isFinite(record.timestamp)
    && isFiniteNonNegative(record.cost)
    && isFiniteNonNegative(record.inputTokens)
    && isFiniteNonNegative(record.outputTokens)
    && isFiniteNonNegative(record.cacheReadTokens)
    && isFiniteNonNegative(record.cacheWriteTokens)
}

function rangeStart(range: UsageSummaryRange, today: string): string | null {
  if (range === 'all') return null
  if (range === 'today') return today
  if (range === '7d') return addDays(today, -6)
  return addDays(today, -29)
}

/** Aggregate persisted eligible records using each record's historical cost. */
export function summarizeUsage(records: readonly UsageRecord[], range: UsageSummaryRange, now = Date.now()): UsageSummary | undefined {
  if (!['all', '30d', '7d', 'today'].includes(range)) return undefined
  const to = beijingToday(now)
  const from = rangeStart(range, to)
  const selected = records.filter(record => {
    if (!isValidRecord(record)) return false
    const date = beijingDate(record.timestamp)
    if (date === undefined) return false
    return (from === null || date >= from) && date <= to
  })
  const spendCny = selected.reduce((sum, record) => sum + record.cost, 0)
  const inputTokens = selected.reduce((sum, record) => sum + record.inputTokens, 0)
  const outputTokens = selected.reduce((sum, record) => sum + record.outputTokens, 0)
  const cacheHitTokens = selected.reduce((sum, record) => sum + record.cacheReadTokens, 0)
  const cacheWriteTokens = selected.reduce((sum, record) => sum + record.cacheWriteTokens, 0)
  const activeDays = new Set(selected.map(record => beijingDate(record.timestamp)).filter((date): date is string => date !== undefined)).size
  return {
    range,
    from: selected.length === 0 ? null : from ?? beijingDate(Math.min(...selected.map(record => record.timestamp))) ?? null,
    to,
    spendCny: Math.round(spendCny * 1000000) / 1000000,
    requestCount: selected.length,
    totalTokens: inputTokens + cacheHitTokens + cacheWriteTokens + outputTokens,
    cacheHitTokens,
    cacheHitRate: inputTokens + cacheHitTokens > 0 ? cacheHitTokens / (inputTokens + cacheHitTokens) : 0,
    activeDays,
  }
}

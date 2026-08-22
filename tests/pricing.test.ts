import assert from 'node:assert/strict'
import test from 'node:test'
import {
  LEGACY_PRICE_TABLE,
  PRICE_TABLE,
  beijingWeekday,
  isPeakHour,
  priceUsage,
  resolveModelPrice,
} from '../plugins/dsh-token-monitor/src/pricing.ts'
import { isPeakPeriod } from '../packages/client/ui-token-monitor/src/client/peakPeriod.ts'

const OFF_PEAK = Date.UTC(2026, 7, 21, 0, 0, 0)
const PEAK = Date.UTC(2026, 7, 21, 2, 0, 0)
const beijing = (day: number, hour: number, minute = 0) => Date.UTC(2026, 7, day, hour - 8, minute)

test('resolves the official vision model and versioned ids', () => {
  assert.deepEqual(resolveModelPrice('deepseek-v4-flash-vision-exp', PRICE_TABLE), PRICE_TABLE.models['deepseek-v4-flash-vision-exp'])
  assert.deepEqual(resolveModelPrice('deepseek-v4-flash-vision-exp-2026', PRICE_TABLE), PRICE_TABLE.models['deepseek-v4-flash-vision-exp'])
})

test('prices image tokens already included in prompt usage exactly once', () => {
  // The adapter reports image + text as prompt_tokens.  384 image tokens are
  // intentionally treated as ordinary uncached input when no cache hit exists.
  const cost = priceUsage(1_000 + 384, 0, 0, 2_000, 'deepseek-v4-flash-vision-exp', OFF_PEAK)
  assert.equal(cost.costInput, 1_384 / 1e6 * 1.5)
  assert.equal(cost.costOutput, 2_000 / 1e6 * 4.5)
  assert.equal(cost.cost, cost.costInput + cost.costOutput)
})

test('prices vision cache hits and misses with the official peak multiplier', () => {
  const offPeak = priceUsage(1_000, 500, 0, 2_000, 'deepseek-v4-flash-vision-exp', OFF_PEAK)
  const peak = priceUsage(1_000, 500, 0, 2_000, 'deepseek-v4-flash-vision-exp', PEAK)
  assert.equal(peak.cost, offPeak.cost * 2)
  assert.equal(offPeak.costCacheRead, 500 / 1e6 * 0.05)
  assert.equal(offPeak.costInput, 1_000 / 1e6 * 1.5)
})

test('keeps the legacy table available for pre-price-change records', () => {
  const old = priceUsage(1_000, 500, 0, 2_000, 'deepseek-v4-flash-vision-exp', Date.UTC(2026, 7, 15, 1, 0, 0))
  assert.equal(old.costInput, 1_000 / 1e6 * 1.0)
  assert.equal(old.costCacheRead, 500 / 1e6 * 0.02)
  assert.equal(old.costOutput, 2_000 / 1e6 * 2.0)
  assert.equal(LEGACY_PRICE_TABLE.models['deepseek-v4-flash-vision-exp']?.offPeak.input, 1.0)
})

test('keeps weekday peak windows and charges the whole weekend at valley rates', () => {
  const cases: Array<[number, boolean]> = [
    [beijing(21, 8, 59), false],
    [beijing(21, 9), true],
    [beijing(21, 12), false],
    [beijing(21, 14), true],
    [beijing(21, 18), false],
    [beijing(22, 9), false],
    [beijing(22, 14), false],
    [beijing(23, 9), false],
    [beijing(24, 9), true],
  ]
  for (const [timestamp, expected] of cases) {
    assert.equal(isPeakHour(timestamp, PRICE_TABLE.peakHours), expected)
    assert.equal(isPeakPeriod(timestamp), expected)
  }

  const saturday = beijing(22, 10)
  const known = priceUsage(1_000_000, 0, 0, 0, 'deepseek-v4-flash', saturday)
  const fallback = priceUsage(1_000_000, 0, 0, 0, 'future-deepseek-model', saturday)
  assert.equal(known.costInput, 1.5)
  assert.equal(fallback.costInput, 1.5)
})

test('uses the Asia/Shanghai day boundary instead of the host local timezone', () => {
  assert.equal(beijingWeekday(Date.UTC(2026, 7, 21, 15, 59)), 5)
  assert.equal(beijingWeekday(Date.UTC(2026, 7, 21, 16, 0)), 6)
})

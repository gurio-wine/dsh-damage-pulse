import assert from 'node:assert/strict'
import test from 'node:test'
import {
  LEGACY_PRICE_TABLE,
  PRICE_TABLE,
  priceUsage,
  resolveModelPrice,
} from '../plugins/dsh-token-monitor/src/pricing.ts'

const OFF_PEAK = Date.UTC(2026, 7, 21, 0, 0, 0)
const PEAK = Date.UTC(2026, 7, 21, 2, 0, 0)

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

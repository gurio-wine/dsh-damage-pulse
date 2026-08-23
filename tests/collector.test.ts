import assert from 'node:assert/strict'
import test from 'node:test'
import type { Context } from '@deepseek-ai/cordis'
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'
import { currentChargeSeq } from '../plugins/dsh-token-monitor/src/charge.ts'
import { attachCollector } from '../plugins/dsh-token-monitor/src/collector.ts'
import { OFFICIAL_PROVIDER_ID, PRICE_TABLE } from '../plugins/dsh-token-monitor/src/pricing.ts'
import type { UsageStorage } from '../plugins/dsh-token-monitor/src/storage.ts'
import type { UsageRecord } from '../plugins/dsh-token-monitor/src/types.ts'

const EVENT_TIME = Date.UTC(2026, 7, 21, 0, 0, 0)

test('collector emits storage, charge and session records only for eligible usage', () => {
  let listener: ((session: Session, event: SessionEvent) => void) | undefined
  const context = {
    on: (_name: string, callback: (session: Session, event: SessionEvent) => void) => { listener = callback },
  } as unknown as Context
  const stored: UsageRecord[] = []
  const storage = {
    add: (record: UsageRecord) => {
      stored.push(record)
      return { sessionId: record.sessionId }
    },
  } as unknown as UsageStorage
  const appended: unknown[] = []
  const session = {
    id: 'session-m0',
    append: (...args: unknown[]) => { appended.push(args) },
  } as unknown as Session
  const eventFor = (provider: string, model: string) => ({
    type: 'assistant/message',
    time: EVENT_TIME,
    data: {
      turn: 1,
      step: 1,
      message: { source: { kind: 'model', provider, model } },
      usage: { inputTokens: 1_000, outputTokens: 100 },
    },
  }) as unknown as SessionEvent

  attachCollector(context, storage, PRICE_TABLE)
  assert.ok(listener)
  const initialChargeSeq = currentChargeSeq()

  listener(session, eventFor('openai-compatible', 'deepseek-v4-flash'))
  listener(session, eventFor(OFFICIAL_PROVIDER_ID, 'future-deepseek-model'))
  assert.equal(stored.length, 0)
  assert.equal(appended.length, 0)
  assert.equal(currentChargeSeq(), initialChargeSeq)

  listener(session, eventFor(OFFICIAL_PROVIDER_ID, 'deepseek-v4-flash'))
  assert.equal(stored.length, 1)
  assert.equal(appended.length, 1)
  assert.equal(currentChargeSeq(), initialChargeSeq + 1)
})

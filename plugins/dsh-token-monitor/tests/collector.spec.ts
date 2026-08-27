import { describe, expect, it, vi } from 'vitest'
import { attachCollector } from '../src/collector.ts'
import { OFFICIAL_PROVIDER_ID, PRICE_TABLE } from '../src/pricing.ts'

describe('usage collector', () => {
  it('drops a valid zero-token usage before storage and notifications', () => {
    let listener: ((session: unknown, event: unknown) => void) | undefined
    const context = {
      on: vi.fn((_name: string, callback: (session: unknown, event: unknown) => void) => { listener = callback }),
    }
    const storage = { add: vi.fn() }
    const onPersistedRecord = vi.fn()
    attachCollector(context as never, storage as never, PRICE_TABLE, { onPersistedRecord })

    const append = vi.fn()
    listener?.({ id: 'session-zero', append }, {
      type: 'assistant/message',
      seq: 9,
      time: Date.parse('2026-08-24T02:00:00.000Z'),
      data: {
        turn: 1,
        step: 1,
        message: { source: { kind: 'model', provider: OFFICIAL_PROVIDER_ID, model: 'deepseek-v4-flash' } },
        usage: { inputTokens: 0, outputTokens: 0 },
      },
    })

    expect(storage.add).not.toHaveBeenCalled()
    expect(onPersistedRecord).not.toHaveBeenCalled()
    expect(append).not.toHaveBeenCalled()
  })
})

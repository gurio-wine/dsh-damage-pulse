import type { Context } from '@deepseek-ai/cordis'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BalanceService } from '../src/balance.ts'

function contextWithApiKey(): Context {
  return {
    credentials: {
      resolve: vi.fn().mockResolvedValue({ value: 'test-key' }),
    },
  } as unknown as Context
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('BalanceService', () => {
  it('keeps the last successful balance when a later refresh fails', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            is_available: true,
            balance_infos: [
              {
                currency: 'CNY',
                total_balance: '12.50',
                granted_balance: '2.50',
                topped_up_balance: '10.00',
              },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(new Response('temporary failure', { status: 503 }))
    vi.stubGlobal('fetch', fetchMock)

    const service = new BalanceService(contextWithApiKey())
    await expect(service.refresh()).resolves.toMatchObject({ totalBalance: 12.5 })
    const cached = service.get()

    await expect(service.refresh()).resolves.toBeUndefined()

    expect(service.get()).toBe(cached)
    expect(service.get()?.totalBalance).toBe(12.5)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('balance HTTP 503'))
  })
})

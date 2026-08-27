// @vitest-environment jsdom

import { cleanup, render, waitFor } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BalanceWidget } from '../src/client/BalanceWidget.tsx'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('BalanceWidget route gate', () => {
  it('does not poll Token Monitor endpoints when the current route is ineligible', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch')
    const loadRouteEligibility = vi.fn().mockResolvedValue(false)
    const useSessions = (selector: (state: { current: string }) => unknown) => selector({ current: 'session-1' })

    const props = { useSessions, loadRouteEligibility } as unknown as ComponentProps<typeof BalanceWidget>
    const view = render(<BalanceWidget {...props} />)

    await waitFor(() => expect(loadRouteEligibility).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(view.container.childElementCount).toBe(0))
    expect(fetcher).not.toHaveBeenCalled()
  })
})

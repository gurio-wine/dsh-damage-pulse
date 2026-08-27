import { describe, expect, it } from 'vitest'
import { selectBalanceInfo, type BalanceResponse } from '../src/balance-selection.ts'

const cny = { currency: 'CNY', total_balance: '81.69', granted_balance: '1.69', topped_up_balance: '80.00' }
const emptyUsd = { currency: 'USD', total_balance: '0.00', granted_balance: '0.00', topped_up_balance: '0.00' }
const response = (balance_infos: BalanceResponse['balance_infos']): BalanceResponse => ({ is_available: true, balance_infos })

describe('balance selection', () => {
  it('selects funded CNY regardless of response order', () => {
    expect(selectBalanceInfo(response([emptyUsd, cny])).currency).toBe('CNY')
    expect(selectBalanceInfo(response([cny, emptyUsd])).currency).toBe('CNY')
  })
  it('keeps a funded non-CNY account over an empty CNY entry', () => {
    expect(selectBalanceInfo(response([{ ...emptyUsd, currency: 'CNY' }, { ...emptyUsd, total_balance: '12.50' }])).currency).toBe('USD')
  })
  it('ignores malformed secondary entries and rejects no valid entries', () => {
    expect(selectBalanceInfo(response([{ ...cny, total_balance: 'bad' }, emptyUsd])).currency).toBe('USD')
    expect(() => selectBalanceInfo(response([]))).toThrow(/no valid balance_infos/)
  })
  it('accepts legitimate negative balances returned for an overdrawn account', () => {
    const overdrawn = { currency: 'CNY', total_balance: '-0.25', granted_balance: '0.00', topped_up_balance: '-0.25' }
    expect(selectBalanceInfo(response([overdrawn]))).toMatchObject({ currency: 'CNY', totalBalance: -0.25 })
    expect(selectBalanceInfo(response([{ ...overdrawn, granted_balance: '-1.00' }]))).toMatchObject({ grantedBalance: -1 })
  })
  it('rejects non-finite amount fields', () => {
    expect(() => selectBalanceInfo(response([{ ...cny, topped_up_balance: 'bad' }]))).toThrow(/no valid balance_infos/)
  })
  it.each(['', '   ', '\t\r\n'])('rejects empty or whitespace-only amount fields', (amount) => {
    expect(() => selectBalanceInfo(response([{ ...cny, total_balance: amount }]))).toThrow(/no valid balance_infos/)
  })
})

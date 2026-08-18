/** DeepSeek /user/balance 原始响应（金额字段为字符串）。 */
export interface BalanceResponse {
  is_available?: boolean
  balance_infos?: Array<{
    currency?: string
    total_balance?: string
    granted_balance?: string
    topped_up_balance?: string
  }>
}

interface ParsedBalance {
  currency: string
  totalBalance: number
  grantedBalance: number
  toppedUpBalance: number
}

function parseAmount(value: string | undefined, field: string): number {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(`balance response has invalid ${field}`)
  }
  return amount
}

function parseEntry(info: NonNullable<BalanceResponse['balance_infos']>[number]): ParsedBalance {
  const currency = info.currency?.trim().toUpperCase()
  if (currency === undefined || currency.length === 0) {
    throw new Error('balance response has invalid currency')
  }
  return {
    currency,
    totalBalance: parseAmount(info.total_balance, 'total_balance'),
    grantedBalance: parseAmount(info.granted_balance, 'granted_balance'),
    toppedUpBalance: parseAmount(info.topped_up_balance, 'topped_up_balance'),
  }
}

/**
 * DeepSeek may return several currencies in arbitrary order. Select a funded
 * entry deterministically instead of trusting balance_infos[0]. Malformed
 * secondary entries are ignored while at least one valid entry remains.
 */
export function selectBalanceInfo(response: BalanceResponse): ParsedBalance {
  const entries: ParsedBalance[] = []
  for (const info of response.balance_infos ?? []) {
    try {
      entries.push(parseEntry(info))
    } catch {
      // A malformed secondary currency must not hide a valid account balance.
    }
  }

  if (entries.length === 0) throw new Error('balance response has no valid balance_infos')

  entries.sort((left, right) => {
    const funded = Number(right.totalBalance > 0) - Number(left.totalBalance > 0)
    if (funded !== 0) return funded
    const preferredCurrency = Number(right.currency === 'CNY') - Number(left.currency === 'CNY')
    if (preferredCurrency !== 0) return preferredCurrency
    const total = right.totalBalance - left.totalBalance
    if (total !== 0) return total
    return left.currency.localeCompare(right.currency)
  })

  return entries[0]!
}

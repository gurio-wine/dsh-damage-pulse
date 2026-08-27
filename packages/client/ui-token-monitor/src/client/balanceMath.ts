/** Apply one queued debit to the local visual balance without hiding overdraft. */
export function applyDebitToDisplay(previous: number | null, debit: number): number | null {
  if (previous === null || !Number.isFinite(debit) || debit < 0) return previous
  return previous - debit
}

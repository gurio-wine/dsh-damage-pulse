/**
 * 会话累计条：挂在输入区卡片下方的环境读数带（conversation.composer.dock），
 * 读自 tokenCost session projection（whole value，由 history 尾页 seed、
 * session/projection 帧更新），无 store、无事件监听。
 */
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { TokenCostProjection } from './types.ts'

type SessionStatsBarProps = PropsRuntime<'conversation.composer.dock'>

const BAR: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'baseline',
  gap: 10,
  fontSize: 12,
  lineHeight: '16px',
  color: 'var(--dsh-color-text-secondary, #888)',
  fontVariantNumeric: 'tabular-nums',
}

const COST: React.CSSProperties = {
  fontWeight: 600,
  color: 'var(--dsh-color-accent, #4c8dff)',
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

function fmtCost(n: number): string {
  if (n === 0) return '¥0'
  if (n < 0.0001) return `¥${n.toExponential(2)}`
  if (n < 0.01) return `¥${n.toFixed(5)}`
  return `¥${n.toFixed(4)}`
}

export function SessionStatsBar({ useProjection }: SessionStatsBarProps) {
  const projection = useProjection('tokenCost')
  // undefined = 能力缺失或加载中；null 或 0 次调用 = 暂无数据。
  if (projection === undefined || projection === null) return null
  const p = projection as TokenCostProjection
  if (p.calls === 0) return null
  return (
    <div style={BAR} data-token-monitor-stats="">
      <span>本次会话</span>
      <span style={COST}>{fmtCost(p.cost)}</span>
      <span>{fmtTokens(p.totalTokens)} tokens</span>
      <span>{p.calls} 次调用</span>
      <span>↑ {fmtTokens(p.inputTokens + p.cacheWriteTokens)}</span>
      <span>↓ {fmtTokens(p.outputTokens)}</span>
    </div>
  )
}

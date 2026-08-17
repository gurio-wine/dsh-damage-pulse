/**
 * 余额悬浮卡片：挂载在 frame 级浮动层（shell.overlay，右下角）。
 *
 * 数据源两个：
 * - 扣费：每秒增量拉取 /api/token-monitor/charge-events（Host collector 每次模型调用算出的精确 cost），
 *   合并该秒内扣费 → 余额本地精确扣减 + 红色「扣血」飘字动画 + 数字红色闪烁 + 下沉回弹微动。
 * - 余额：每 60 秒拉取 /api/token-monitor/balance，校准显示余额；检测到余额变多（充值）→
 *   绿色「加费」飘字动画 + 数字绿色闪烁。
 *
 * 全局（root scope）组件，无 session 依赖。
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { BalanceInfo } from './types.ts'

type BalanceWidgetProps = PropsRuntime<'shell.overlay'>

const CARD: React.CSSProperties = {
  position: 'fixed',
  padding: '6px 12px',
  borderRadius: 8,
  background: 'var(--dsh-color-surface-overlay, rgba(30, 30, 30, 0.82))',
  color: 'var(--dsh-color-text, #e8e8e8)',
  fontSize: 16, // 与输入框字号一致，便于查看
  lineHeight: '22px',
  fontVariantNumeric: 'tabular-nums',
  pointerEvents: 'auto',
  cursor: 'grab',
  userSelect: 'none',
  boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
  zIndex: 1000,
}

const RED = '#ff3b30'
const GREEN = '#30a46c'

/** 命中脉冲：飘字短促弹出上浮，余额数字同步下沉回弹。 */
const KEYFRAMES = `
@keyframes tkm-impact-float {
  0%   { opacity: 0; transform: translateY(6px) scale(0.5); }
  14%  { opacity: 1; transform: translateY(-6px) scale(1.25); }
  30%  { opacity: 1; transform: translateY(-21px) scale(0.98); }
  70%  { opacity: 1; transform: translateY(-63px) scale(1); }
  100% { opacity: 0; transform: translateY(-90px) scale(0.9); }
}
@keyframes tkm-balance-hit {
  0%   { transform: translateY(0) scale(1); }
  26%  { transform: translateY(3px) scale(0.97); }
  58%  { transform: translateY(-1px) scale(1.015); }
  100% { transform: translateY(0) scale(1); }
}
@keyframes tkm-miss-float {
  0%   { opacity: 0; filter: blur(1.5px); transform: translateY(9px) scale(0.36) rotate(-3deg); }
  12%  { opacity: 1; filter: blur(0); transform: translateY(-12px) scale(1.52) rotate(1deg); }
  23%  { transform: translate(-4px, -27px) scale(0.96) rotate(-1deg); }
  34%  { transform: translate(3px, -39px) scale(1.08); }
  64%  { opacity: 1; transform: translateY(-87px) scale(1); }
  100% { opacity: 0; transform: translateY(-132px) scale(0.88); }
}
@keyframes tkm-balance-miss {
  0%   { transform: translate(0, 0) scale(1); }
  12%  { transform: translate(-3px, 4px) scale(0.94); text-shadow: 0 0 8px rgba(255,59,48,0.7); }
  23%  { transform: translate(3px, 1px) scale(1.04); }
  34%  { transform: translate(-2px, -1px) scale(0.99); }
  48%  { transform: translate(1px, 0) scale(1.015); }
  100% { transform: translate(0, 0) scale(1); text-shadow: none; }
}
@keyframes tkm-impact-float-reduced {
  0%   { opacity: 0; transform: translateY(6px); }
  35%  { opacity: 1; transform: translateY(-6px); }
  100% { opacity: 0; transform: translateY(-30px); }
}
@media (prefers-reduced-motion: reduce) {
  .tkm-impact-float {
    animation: tkm-impact-float-reduced 180ms ease-out forwards !important;
  }
  .tkm-miss-float {
    animation: tkm-impact-float-reduced 180ms ease-out forwards !important;
  }
  .tkm-balance-hit,
  .tkm-balance-miss {
    animation: none !important;
  }
}
`

/** 飘字锚定余额数字，不参与卡片布局。 */
const FLOAT: React.CSSProperties = {
  position: 'absolute',
  right: 0,
  bottom: 0,
  fontSize: 18,
  fontWeight: 700,
  fontVariantNumeric: 'tabular-nums',
  pointerEvents: 'none',
  zIndex: 1001,
  animation: 'tkm-impact-float 1000ms cubic-bezier(.2,.86,.25,1) forwards',
  transformOrigin: '50% 70%',
  whiteSpace: 'nowrap',
  willChange: 'transform, opacity',
  textShadow: '0 1px 3px rgba(0,0,0,0.5)',
}

/** 悬浮窗位置持久化 key。 */
const POS_KEY = 'dsh-token-monitor-balance-pos'

/** 从 localStorage 恢复上次位置；缺失或非法则用右下角默认值。 */
function loadPos(): { left: number; top: number } {
  try {
    const raw = localStorage.getItem(POS_KEY)
    if (raw !== null) {
      const parsed = JSON.parse(raw) as { left?: unknown; top?: unknown }
      if (typeof parsed.left === 'number' && typeof parsed.top === 'number') {
        return { left: parsed.left, top: parsed.top }
      }
    }
  } catch {
    // 忽略解析失败，回退默认。
  }
  return { left: Math.max(0, window.innerWidth - 220), top: Math.max(0, window.innerHeight - 72) }
}

/** 持久化悬浮窗位置。 */
function savePos(pos: { left: number; top: number }): void {
  try {
    localStorage.setItem(POS_KEY, JSON.stringify(pos))
  } catch {
    // 忽略写入失败（隐私模式等）。
  }
}

/** 限制数值在 [min, max] 区间。 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** 紧凑金额格式：小金额保留 4 位，大金额保留 2 位。 */
function fmtCost(cost: number): string {
  return cost < 0.01 ? cost.toFixed(4) : cost.toFixed(2)
}

/** 高峰时段（北京时间，半开区间 [start, end)）。 */
const PEAK_HOURS: Array<[number, number]> = [[9, 12], [14, 18]]

/** 取时间戳对应的北京时间小时（0-23）；解析失败返回 -1。 */
function beijingHour(ts: number): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(new Date(ts))
  const hour = parts.find((p) => p.type === 'hour')?.value
  return hour === undefined ? -1 : Number(hour)
}

/** 当前时刻是否落在高峰时段。 */
function isPeakNow(): boolean {
  const hour = beijingHour(Date.now())
  return PEAK_HOURS.some(([start, end]) => hour >= start && hour < end)
}

interface FloatAnim {
  id: number
  text: string
  color: 'red' | 'green'
  damageKind: DamageKind
  label?: '命中' | '未命中' | '输出'
}

type DamageKind = 'normal' | 'miss' | 'output'

interface PendingFloat {
  text: string
  color: 'red' | 'green'
  kind: DamageKind
  label?: FloatAnim['label']
}

const CHARGE_POLL_MS = 1_000
const BALANCE_POLL_MS = 60_000
const FLOAT_MS = 1_000
const MISS_FLOAT_MS = 1_250
const FLOAT_EMIT_INTERVAL_MS = 200
const FLASH_MS = 620

export function BalanceWidget(_props: BalanceWidgetProps) {
  // undefined = 加载中（不渲染）；null = 端点返回空（未查询到余额）。
  const [balanceInfo, setBalanceInfo] = useState<BalanceInfo | null | undefined>(undefined)
  // 本地维护的显示余额（null = 尚未从余额接口初始化基线）。
  const [display, setDisplay] = useState<number | null>(null)
  const [error, setError] = useState(false)
  // 余额数字闪烁：'red' 扣费 / 'green' 加费 / null 正常。
  const [flash, setFlash] = useState<'red' | 'green' | null>(null)
  // 下沉回弹微动触发器：每次扣费/加费递增，重新挂载数字使 dip 动画重播。
  const [dipKey, setDipKey] = useState(0)
  const [damageKind, setDamageKind] = useState<DamageKind>('normal')
  const [anims, setAnims] = useState<FloatAnim[]>([])
  // 悬浮窗位置（left/top），初始从 localStorage 恢复或默认右下角。
  const [pos, setPos] = useState<{ left: number; top: number }>(loadPos)
  const [dragging, setDragging] = useState(false)
  // 当前峰谷状态：true 高峰 / false 闲时。
  const [isPeak, setIsPeak] = useState(isPeakNow)

  const chargeSeq = useRef(0)
  // 扣费游标是否已建立基线：首次拉取只取当前 seq（余额接口值已含历史扣费），跳过历史 events。
  const chargeSeeded = useRef(false)
  const animId = useRef(0)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const animTimers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set())
  const animQueue = useRef<PendingFloat[]>([])
  const queueTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  // 拖拽起点：按下时的鼠标位置 + 卡片位置。
  const dragStart = useRef<{ x: number; y: number; left: number; top: number } | null>(null)

  /** 拖拽开始：记录起点，捕获指针。 */
  const onPointerDown = useCallback((event: React.PointerEvent) => {
    if (event.button !== 0) return
    dragStart.current = { x: event.clientX, y: event.clientY, left: pos.left, top: pos.top }
    setDragging(true)
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  }, [pos])

  /** 拖拽移动：按位移更新位置，并限制在视口内。 */
  const onPointerMove = useCallback((event: React.PointerEvent) => {
    const start = dragStart.current
    if (start === null) return
    setPos({
      left: clamp(start.left + event.clientX - start.x, 0, Math.max(0, window.innerWidth - 64)),
      top: clamp(start.top + event.clientY - start.y, 0, Math.max(0, window.innerHeight - 32)),
    })
  }, [])

  /** 拖拽结束：持久化位置。 */
  const onPointerUp = useCallback((event: React.PointerEvent) => {
    if (dragStart.current === null) return
    dragStart.current = null
    setDragging(false)
    ;(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId)
    // 持久化最终位置（用 pos 的最新值）。
    setPos((current) => {
      savePos(current)
      return current
    })
  }, [])

  /** 将一条反馈真正发射到共同轨道。 */
  const emit = useCallback((pending: PendingFloat) => {
    const { text, color, kind, label } = pending
    const id = ++animId.current
    const next = { text, color, damageKind: kind, label }
    setAnims((list) => [...list, { id, ...next }].slice(-3))
    setFlash(color)
    setDamageKind(kind)
    setDipKey((key) => key + 1)
    if (flashTimer.current !== undefined) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setFlash(null), FLASH_MS)
    const timer = setTimeout(() => {
      animTimers.current.delete(timer)
      setAnims((list) => list.filter((anim) => anim.id !== id))
    }, kind === 'miss' ? MISS_FLOAT_MS : FLOAT_MS)
    animTimers.current.add(timer)
  }, [])

  /** FIFO 发射器：首条立即出现，后续每 200ms 错峰发射。 */
  const drainQueue = useCallback(function drain() {
    const next = animQueue.current.shift()
    if (next === undefined) {
      queueTimer.current = undefined
      return
    }
    emit(next)
    // 保留一个完整发射间隔作为冷却窗，确保同批同步入队也会错峰。
    queueTimer.current = setTimeout(drain, FLOAT_EMIT_INTERVAL_MS)
  }, [emit])

  /** 将反馈加入共同轨道队列，连续触发时保持可辨识的部分覆盖。 */
  const trigger = useCallback((
    text: string,
    color: 'red' | 'green',
    kind: DamageKind = 'normal',
    label?: FloatAnim['label'],
  ) => {
    animQueue.current.push({ text, color, kind, label })
    if (queueTimer.current === undefined && animQueue.current.length === 1) drainQueue()
  }, [drainQueue])

  useEffect(() => () => {
    if (flashTimer.current !== undefined) clearTimeout(flashTimer.current)
    if (queueTimer.current !== undefined) clearTimeout(queueTimer.current)
    animTimers.current.forEach((timer) => clearTimeout(timer))
    animTimers.current.clear()
    animQueue.current = []
  }, [])

  // 峰谷状态刷新：每 30 秒重算一次（跨整点边界最多延迟 30 秒）。
  useEffect(() => {
    const update = () => setIsPeak(isPeakNow())
    const timer = setInterval(update, 30_000)
    return () => clearInterval(timer)
  }, [])

  // 扣费轮询：每秒增量拉取，合并该秒内扣费，本地精确扣减 + 红色动画。
  useEffect(() => {
    let cancelled = false
    const poll = async () => {
      try {
        const res = await fetch(`/api/token-monitor/charge-events?since=${chargeSeq.current}`, { cache: 'no-store' })
        if (!res.ok) return
        const data = (await res.json()) as {
          seq: number
          events: Array<{
            seq: number
            cost: number
            timestamp: number
            damageKind?: 'normal' | 'miss'
            breakdown?: {
              cacheHit?: { tokens?: number; cost?: number }
              cacheMiss?: { tokens?: number; cost?: number }
              output?: { tokens?: number; cost?: number }
            }
          }>
        }
        if (!chargeSeeded.current) {
          // 首次：只建立游标基线（跳过余额接口已含的历史扣费，避免重复扣减）。
          chargeSeeded.current = true
          chargeSeq.current = data.seq
          return
        }
        chargeSeq.current = data.seq
        const events = data.events ?? []
        if (events.length === 0) return
        const total = events.reduce((sum, event) => sum + event.cost, 0)
        const components = { hit: 0, miss: 0, output: 0 }
        let hasBreakdown = true
        for (const event of events) {
          const b = event.breakdown
          if (b === undefined) {
            hasBreakdown = false
            break
          }
          const hit = Number(b.cacheHit?.cost ?? 0)
          const miss = Number(b.cacheMiss?.cost ?? 0)
          const output = Number(b.output?.cost ?? 0)
          if (![hit, miss, output, event.cost].every(Number.isFinite) || hit < 0 || miss < 0 || output < 0) {
            hasBreakdown = false
            break
          }
          const sum = hit + miss + output
          if (Math.abs(sum - event.cost) > Math.max(1e-9, Math.abs(event.cost) * 1e-6)) {
            hasBreakdown = false
            break
          }
          components.hit += hit
          components.miss += miss
          components.output += output
        }
        if (!hasBreakdown) {
          components.hit = 0
          components.miss = 0
          components.output = 0
        }
        const mergedDamageKind: 'normal' | 'miss' = hasBreakdown
          ? (components.miss > 0 ? 'miss' : 'normal')
          : (events.some(event => event.damageKind === 'miss') ? 'miss' : 'normal')
        if (cancelled) return
        // 余额本地扣减（仅在已有基线后生效）。
        setDisplay((prev) => (prev === null ? null : prev - total))
        if (hasBreakdown) {
          // 同一批次余额只扣一次；分量仅驱动动画。未命中最后触发以保持最强余额回弹。
          if (components.hit > 0) trigger(`-${fmtCost(components.hit)}¥`, 'red', 'normal', '命中')
          if (components.output > 0) trigger(`-${fmtCost(components.output)}¥`, 'red', 'output', '输出')
          if (components.miss > 0) trigger(`-${fmtCost(components.miss)}¥`, 'red', 'miss', '未命中')
        } else {
          trigger(`-${fmtCost(total)}¥`, 'red', mergedDamageKind)
        }
      } catch {
        // 扣费轮询失败静默（不影响余额显示）。
      }
    }
    void poll()
    const timer = setInterval(() => void poll(), CHARGE_POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [trigger])

  // 余额轮询：每 60 秒校准显示余额，检测充值（余额变多）触发绿色动画。
  useEffect(() => {
    let cancelled = false
    const poll = async () => {
      try {
        const res = await fetch('/api/token-monitor/balance', { cache: 'no-store' })
        if (!res.ok) {
          if (!cancelled) setError(true)
          return
        }
        const data = (await res.json()) as BalanceInfo | null
        if (cancelled) return
        setBalanceInfo(data)
        setError(false)
        if (data !== null) {
          setDisplay((prev) => {
            const grew = prev !== null && data.totalBalance > prev + 1e-9
            if (grew) trigger(`+${fmtCost(data.totalBalance - prev!)}¥`, 'green')
            return data.totalBalance
          })
        }
      } catch {
        if (!cancelled) setError(true)
      }
    }
    void poll()
    const timer = setInterval(() => void poll(), BALANCE_POLL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [trigger])

  if (balanceInfo === undefined) return null

  if (balanceInfo === null || error) {
    return (
      <div style={CARD} data-token-monitor-balance="">
        余额：未配置 API Key 或查询失败
      </div>
    )
  }

  const amountColor = flash === 'red' ? RED : flash === 'green' ? GREEN : 'var(--dsh-color-accent, #4c8dff)'
  const shown = display ?? balanceInfo.totalBalance

  return (
    <div
      style={{ ...CARD, left: pos.left, top: pos.top, cursor: dragging ? 'grabbing' : 'grab' }}
      data-token-monitor-balance=""
      title="DeepSeek 账户余额（扣费实时、余额 60s 校准；可拖动）"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <style>{KEYFRAMES}</style>
      余额{' '}
      <span
        style={{
          position: 'relative',
          display: 'inline-block',
        }}
      >
        {anims.map(anim => (
          <span
            key={anim.id}
            className={anim.damageKind === 'miss' ? 'tkm-miss-float' : 'tkm-impact-float'}
            style={{
              ...FLOAT,
              color: anim.color,
              display: anim.damageKind === 'miss' ? 'flex' : undefined,
              alignItems: anim.damageKind === 'miss' ? 'baseline' : undefined,
              gap: anim.damageKind === 'miss' ? 5 : undefined,
              fontSize: anim.damageKind === 'miss' ? 23 : anim.damageKind === 'output' ? 13 : FLOAT.fontSize,
              fontWeight: anim.damageKind === 'miss' ? 800 : anim.damageKind === 'output' ? 600 : FLOAT.fontWeight,
              opacity: anim.damageKind === 'output' ? 0.72 : undefined,
              animation: anim.damageKind === 'miss'
                ? 'tkm-miss-float 1250ms cubic-bezier(.15,.88,.22,1) forwards'
                : FLOAT.animation,
              textShadow: anim.damageKind === 'miss'
                ? '0 1px 3px rgba(0,0,0,0.72), 0 0 10px rgba(255,59,48,0.55)'
                : FLOAT.textShadow,
            }}
          >
            {anim.label !== undefined && (
              <span style={{
                color: RED,
                fontSize: anim.damageKind === 'output' ? 10 : 11,
                fontWeight: anim.damageKind === 'output' ? 700 : 800,
                marginRight: anim.damageKind === 'miss' ? 0 : 4,
              }}>
                {anim.label}
              </span>
            )}
            <span>{anim.text}</span>
          </span>
        ))}
        <span
          key={dipKey}
          className={damageKind === 'miss' ? 'tkm-balance-miss' : 'tkm-balance-hit'}
          style={{
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            display: 'inline-block',
            color: amountColor,
            transition: 'color 0.25s ease',
            animation: damageKind === 'miss'
              ? 'tkm-balance-miss 620ms cubic-bezier(.2,.86,.25,1)'
              : 'tkm-balance-hit 440ms cubic-bezier(.2,.9,.25,1)',
          }}
        >
          {balanceInfo.currency} {shown.toFixed(2)}
        </span>
      </span>
      {balanceInfo.grantedBalance > 0 ? ` · 赠送 ${balanceInfo.grantedBalance.toFixed(2)}` : ''}
      <span
        style={{
          fontWeight: 700,
          marginLeft: 6,
          color: isPeak ? RED : GREEN,
          textShadow: isPeak
            ? '0 0 6px rgba(255,59,48,0.9), 0 0 14px rgba(255,59,48,0.55)'
            : '0 0 6px rgba(48,164,108,0.9), 0 0 14px rgba(48,164,108,0.55)',
          transition: 'color 0.3s ease, text-shadow 0.3s ease',
        }}
      >
        {isPeak ? '峰' : '闲'}
      </span>
    </div>
  )
}

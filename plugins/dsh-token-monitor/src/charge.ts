/**
 * 扣费事件环形缓冲区：collector 每次模型调用完成时记录精确扣费金额，
 * 供 Client 通过 /api/token-monitor/charge-events 增量拉取，
 * 驱动「扣血动画」与余额本地精确扣减。
 * @module dsh-token-monitor/charge
 */

/** 扣血动画类型：缓存命中走普通反馈，缓存未命中/写入走增强反馈。 */
export type DamageKind = 'normal' | 'miss'

export interface ChargeComponent {
  tokens: number
  cost: number
}

/** 一次模型调用的可解释费用构成。各分量费用之和等于 ChargeEvent.cost。 */
export interface ChargeBreakdown {
  cacheHit: ChargeComponent
  cacheMiss: ChargeComponent
  output: ChargeComponent
}

/** 一次模型调用的扣费事件。 */
export interface ChargeEvent {
  /** 单调递增序号，Client 用它做增量拉取游标。 */
  seq: number
  /** 本次扣费金额（元，正数），如 0.0174。 */
  cost: number
  /** 扣费发生时间（epoch ms）。 */
  timestamp: number
  /** Client 应播放的扣血动画类型。 */
  damageKind: DamageKind
  /** 新版 Client 使用的命中/未命中/输出费用分量；旧事件可缺省。 */
  breakdown?: ChargeBreakdown
}

/** 环形缓冲区上限：保留最近 500 次扣费，避免长期运行无限增长。 */
const MAX_EVENTS = 500

const events: ChargeEvent[] = []
let seqCounter = 0

/** 记录一次扣费（cost 为正数金额）。 */
export function recordCharge(
  cost: number,
  timestamp: number,
  damageKind: DamageKind,
  breakdown?: ChargeBreakdown,
): void {
  events.push({ seq: ++seqCounter, cost, timestamp, damageKind, breakdown })
  if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS)
}

/** 返回 seq 严格大于 since 的扣费事件（按 seq 升序）。 */
export function chargesSince(since: number): ChargeEvent[] {
  if (since >= seqCounter) return []
  return events.filter((event) => event.seq > since)
}

/** 当前最大 seq（Client 用它初始化拉取游标）。 */
export function currentChargeSeq(): number {
  return seqCounter
}

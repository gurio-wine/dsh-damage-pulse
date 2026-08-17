/**
 * 会话累计存储 + 单次用量明细持久化（JSONL）。
 * 会话累计（tokenCost projection）已由 session-projection-cache 持久化；
 * 这里额外落盘单次用量明细，供历史查询与导出。
 * @module dsh-token-monitor/storage
 */

import { appendFileSync, mkdirSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { SessionSummary, UsageRecord } from './types.ts'

/** 明细数据目录：~/.dsh/data/dsh-token-monitor/ */
const DATA_DIR = join(homedir(), '.dsh', 'data', 'dsh-token-monitor')

/** 按会话累计用量与金额，并追加持久化单次明细。 */
export class UsageStorage {
  private readonly summaries = new Map<string, SessionSummary>()
  private readonly records: UsageRecord[] = []

  constructor() {
    try {
      mkdirSync(DATA_DIR, { recursive: true })
    } catch (error) {
      console.warn(`[dsh-token-monitor] 创建数据目录失败: ${String(error)}`)
    }
    this.loadHistory()
  }

  /** 冷启动回读历史明细（fail-soft：文件缺失/损坏行静默跳过）。 */
  private loadHistory(): void {
    try {
      const text = readFileSync(join(DATA_DIR, 'usage.jsonl'), 'utf8')
      for (const line of text.split('\n')) {
        const trimmed = line.trim()
        if (trimmed === '') continue
        try {
          this.records.push(JSON.parse(trimmed) as UsageRecord)
        } catch {
          // 跳过损坏的行
        }
      }
      if (this.records.length > 0) {
        console.log(`[dsh-token-monitor] 已加载 ${this.records.length} 条历史明细`)
      }
    } catch {
      // 首次运行无文件，静默
    }
  }

  /** 把一条单次记录累加到对应会话，并追加持久化明细。 */
  add(record: UsageRecord): SessionSummary {
    const prev = this.summaries.get(record.sessionId)
    const next: SessionSummary =
      prev === undefined
        ? {
            sessionId: record.sessionId,
            calls: 1,
            inputTokens: record.inputTokens,
            cacheReadTokens: record.cacheReadTokens,
            cacheWriteTokens: record.cacheWriteTokens,
            outputTokens: record.outputTokens,
            totalTokens:
              record.inputTokens + record.cacheReadTokens + record.cacheWriteTokens + record.outputTokens,
            cost: record.cost,
            lastActivity: record.timestamp,
          }
        : {
            ...prev,
            calls: prev.calls + 1,
            inputTokens: prev.inputTokens + record.inputTokens,
            cacheReadTokens: prev.cacheReadTokens + record.cacheReadTokens,
            cacheWriteTokens: prev.cacheWriteTokens + record.cacheWriteTokens,
            outputTokens: prev.outputTokens + record.outputTokens,
            totalTokens:
              prev.totalTokens +
              record.inputTokens +
              record.cacheReadTokens +
              record.cacheWriteTokens +
              record.outputTokens,
            cost: prev.cost + record.cost,
            lastActivity: record.timestamp,
          }
    this.summaries.set(record.sessionId, next)

    // 明细：内存缓存 + JSONL 追加（fail-soft，落盘失败不影响运行时）。
    this.records.push(record)
    try {
      appendFileSync(join(DATA_DIR, 'usage.jsonl'), `${JSON.stringify(record)}\n`, 'utf8')
    } catch (error) {
      console.warn(`[dsh-token-monitor] 明细落盘失败: ${String(error)}`)
    }

    return next
  }

  get(sessionId: string): SessionSummary | undefined {
    return this.summaries.get(sessionId)
  }

  list(): SessionSummary[] {
    return [...this.summaries.values()]
  }

  /** 单次用量明细（可按会话过滤）。 */
  history(sessionId?: string): UsageRecord[] {
    if (sessionId === undefined) return [...this.records]
    return this.records.filter((record) => record.sessionId === sessionId)
  }
}

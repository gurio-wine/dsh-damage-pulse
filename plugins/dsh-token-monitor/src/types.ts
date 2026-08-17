/**
 * 数据模型与 SessionEventMap 声明合并。
 * @module dsh-token-monitor/types
 */

/** 单次模型调用的用量与金额记录（可 JSON 序列化，用于持久化与客户端回放）。 */
export interface UsageRecord {
  sessionId: string
  turn: number
  step: number
  timestamp: number
  provider: string
  model: string
  /** 缓存未命中输入 token。 */
  inputTokens: number
  /** 缓存命中读取 token。 */
  cacheReadTokens: number
  /** 缓存写入 token（DeepSeek 通常为 0/缺省）。 */
  cacheWriteTokens: number
  /** 输出 token（已含 reasoning，勿重复相加）。 */
  outputTokens: number
  /** 信息性字段：reasoning token 数，已含于 outputTokens。 */
  reasoningTokens: number
  costInput: number
  costCache: number
  /** 缓存命中读取费用。 */
  costCacheRead: number
  /** 缓存写入费用。 */
  costCacheWrite: number
  costOutput: number
  cost: number
  /** 是否高峰时段计价。 */
  peak: boolean
}

/** 单个会话的累计用量与金额。 */
export interface SessionSummary {
  sessionId: string
  calls: number
  inputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  outputTokens: number
  /** input + cacheRead + cacheWrite + output 之和。 */
  totalTokens: number
  cost: number
  lastActivity: number
}

/** DeepSeek 账户余额。 */
export interface BalanceInfo {
  currency: string
  totalBalance: number
  grantedBalance: number
  toppedUpBalance: number
  isAvailable: boolean
  updatedAt: number
}

/** 追加到会话日志的「单次用量」仅日志事件 payload。 */
export interface TokenUsageRecordData {
  record: UsageRecord
}

declare module '@deepseek-ai/dsh-session/types' {
  interface SessionEventMap {
    /**
     * 记录一次模型调用的 token 用量与金额。
     * 仅日志事件：不进入模型 surface / 派生历史，供 Web Client 回放渲染「单次用量行」。
     */
    'token-usage/record': TokenUsageRecordData
  }
}

/** tokenCost projection 的 wire 值：单个会话的累计用量与金额（供 Web Client 会话统计条）。 */
export interface TokenCostProjection {
  calls: number
  /** 缓存未命中输入 token。 */
  inputTokens: number
  /** 缓存命中读取 token。 */
  cacheReadTokens: number
  /** 缓存写入 token。 */
  cacheWriteTokens: number
  /** 输出 token（已含 reasoning）。 */
  outputTokens: number
  /** input + cacheRead + cacheWrite + output 之和。 */
  totalTokens: number
  /** 累计金额（元）。 */
  cost: number
  /** 最后一次模型调用的时间戳。 */
  lastActivity: number
}

declare module '@deepseek-ai/dsh-session-projection/types' {
  interface SessionProjectionMap {
    /** 会话累计 token 用量与金额。 */
    tokenCost: TokenCostProjection
  }
}

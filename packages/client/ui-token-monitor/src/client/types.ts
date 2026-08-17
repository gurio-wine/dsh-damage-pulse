/**
 * Client 半的类型表：tokenCost 投影值、token-usage/record 事件数据与
 * Conversation Node data 的声明合并。与 Host 插件（dsh-damage-pulse）的
 * 定义保持一致（client 聚合独立编译，故在此重复声明）。
 * @module @deepseek-ai/dsh-client-ui-token-monitor/client
 */

/** 单次模型调用的用量与金额记录（wire 值，与 Host UsageRecord 对齐）。 */
export interface TokenUsageRecord {
  sessionId: string
  turn: number
  step: number
  timestamp: number
  provider: string
  model: string
  inputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  outputTokens: number
  reasoningTokens: number
  cost: number
  peak: boolean
}

/** tokenCost 投影的 wire 值：会话累计用量与金额。 */
export interface TokenCostProjection {
  calls: number
  inputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  outputTokens: number
  totalTokens: number
  cost: number
  lastActivity: number
}

/** DeepSeek 账户余额（与 Host BalanceInfo 对齐）。 */
export interface BalanceInfo {
  currency: string
  totalBalance: number
  grantedBalance: number
  toppedUpBalance: number
  isAvailable: boolean
  updatedAt: number
}

declare module '@deepseek-ai/dsh-session/types' {
  interface SessionEventMap {
    /** 一次模型调用的 token 用量与金额（仅日志事件，供用量行回放）。 */
    'token-usage/record': { record: TokenUsageRecord }
  }
}

declare module '@deepseek-ai/dsh-session-projection/types' {
  interface SessionProjectionMap {
    /** 会话累计 token 用量与金额。 */
    tokenCost: TokenCostProjection
  }
}

declare module '@deepseek-ai/dsh-client-ui-conversation/client' {
  interface ChatNodeDataMap {
    /** 对话流内「单次用量行」的 data。 */
    'token-usage': TokenUsageRecord
  }
}

declare module '@deepseek-ai/dsh-client-runtime/client' {
  interface ConversationStepDataMap {
    /** 供同一 Location 内其它 Node 读取的单次用量行数据。 */
    'token-usage': TokenUsageRecord
  }
}

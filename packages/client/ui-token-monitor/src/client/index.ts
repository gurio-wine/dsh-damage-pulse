/**
 * Token 用量与金额面板插件，browser half：对话流内的「单次用量行」
 * （conversation.chat.node）+ 输入区的「会话累计条」（conversation.composer.dock）
 * + frame 级「余额悬浮卡片」（shell.overlay）。
 * 用量行/累计条为投影与事件驱动；余额卡片为 HTTP 轮询，无自有 store。
 */
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only：拉入 conversation slot 契约（chat.node / composer.dock）。
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
// Type-only：拉入 layout 的 shell.overlay slot 契约。
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import { tokenUsageNodeDefinition } from './usage-node.ts'
import { UsageNodeView } from './UsageNodeView.tsx'
import { SessionStatsBar } from './SessionStatsBar.tsx'
import { BalanceWidget } from './BalanceWidget.tsx'

export { UsageNodeView } from './UsageNodeView.tsx'
export { SessionStatsBar } from './SessionStatsBar.tsx'
export { BalanceWidget } from './BalanceWidget.tsx'
export type { BalanceInfo, TokenCostProjection, TokenUsageRecord } from './types.ts'

/** 依赖：slot 注册 + Conversation Node 事件装配。 */
export const inject = ['slots', 'conversationEvents']

export function apply(ctx: ClientContext): void {
  // F1：单次用量行 —— 注册 Conversation Node Definition + keyed renderer。
  ctx.conversationEvents.register(tokenUsageNodeDefinition)
  ctx.slots.inject('conversation.chat.node', () => ctx.slots.register({
    name: 'conversation.chat.node',
    key: 'token-usage',
  }, UsageNodeView))

  // F2：会话累计条 —— 挂在输入区卡片下方（官方 stats line 同一位）。
  ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
    name: 'conversation.composer.dock',
    id: 'token-monitor-stats',
    order: 0,
  }, SessionStatsBar))

  // F3：余额悬浮卡片 —— frame 级浮动层（右下角），additive 席位。
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'token-monitor-balance',
  }, BalanceWidget))
}

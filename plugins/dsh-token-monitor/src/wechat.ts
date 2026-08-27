import type { Context } from '@deepseek-ai/cordis'
import type { WechatRuntimeStatus } from '../../wechat-notify/src/connection.ts'
import type { WechatNotifyResult } from '../../wechat-notify/src/sender.ts'

export interface WechatProvider {
  readonly id: 'wechat'
  readonly source: 'bundled'
  readonly apiVersion: '1'
  readonly capabilities: {
    send: true
    status: true
    login: true
    reconnect: true
    disconnect: true
  }
  send(message: string): Promise<{ ok: boolean; message: string; code?: string }>
  status(): Promise<WechatRuntimeStatus>
  login(): ReturnType<Context['wechatConnection']['login']>
  confirmLogin(sessionId: string): ReturnType<Context['wechatConnection']['confirmLogin']>
  reconnect(): ReturnType<Context['wechatConnection']['reconnect']>
  disconnect(confirm: boolean): ReturnType<Context['wechatConnection']['disconnect']>
}

export interface TokenMonitorWechatService {
  readonly apiVersion: '1'
  getProvider(): WechatProvider
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    tokenMonitorWechat: TokenMonitorWechatService
  }
}

function adaptSendResult(result: WechatNotifyResult): { ok: boolean; message: string; code?: string } {
  if (result.ok) return { ok: true, message: '微信通知已发送' }
  return { ok: false, code: result.code, message: result.detail }
}

/** Compatibility facade backed exclusively by the bundled WeChat services. */
export function createTokenMonitorWechatProvider(ctx: Context): WechatProvider {
  return {
    id: 'wechat',
    source: 'bundled',
    apiVersion: '1',
    capabilities: { send: true, status: true, login: true, reconnect: true, disconnect: true },
    async send(message) {
      return adaptSendResult(await ctx.wechatNotify.send(message))
    },
    status: () => ctx.wechatConnection.status(),
    login: () => ctx.wechatConnection.login(),
    confirmLogin: sessionId => ctx.wechatConnection.confirmLogin(sessionId),
    reconnect: () => ctx.wechatConnection.reconnect(),
    disconnect: confirm => ctx.wechatConnection.disconnect(confirm),
  }
}

/** Register the legacy token-monitor capability without creating another sender. */
export function provideTokenMonitorWechat(ctx: Context): TokenMonitorWechatService {
  const existing = ctx.get('tokenMonitorWechat', false) as TokenMonitorWechatService | undefined
  if (existing?.apiVersion === '1' && typeof existing.getProvider === 'function') return existing

  const provider = createTokenMonitorWechatProvider(ctx)
  const service: TokenMonitorWechatService = { apiVersion: '1', getProvider: () => provider }
  ctx.provide('tokenMonitorWechat', service)
  return service
}

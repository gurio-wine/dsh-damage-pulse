import { execFile } from 'node:child_process'
import { existsSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export interface WechatProvider {
  readonly id: 'wechat'
  readonly source: 'external' | 'bundled' | 'legacy'
  readonly apiVersion: string
  readonly capabilities: { send: boolean; status: boolean; login: boolean; reconnect: boolean; disconnect: boolean }
  send(message: string): Promise<{ ok: boolean; message: string; code?: string }>
  status(): Promise<{ connected: boolean; authenticated?: boolean; detail?: string }>
}

function errorText(error: unknown): string {
  if (error && typeof error === 'object') {
    const value = error as { stderr?: unknown; stdout?: unknown; message?: unknown }
    return [value.stderr, value.stdout, value.message].filter((v): v is string => typeof v === 'string' && v.trim() !== '').join(' | ') || String(error)
  }
  return String(error)
}

/** Minimal bundled fallback. It is an adapter, not a second Cordis plugin. */
export function createBundledWechatProvider(cliPath = process.env.WECHAT_NOTIFY_CLAWBOT_INDEX): WechatProvider {
  return {
    id: 'wechat', source: 'bundled', apiVersion: '1',
    capabilities: { send: true, status: true, login: false, reconnect: false, disconnect: false },
    async send(message) {
      if (!cliPath) return { ok: false, code: 'NOT_CONFIGURED', message: '微信通知不可用：未配置 WECHAT_NOTIFY_CLAWBOT_INDEX。' }
      const file = tmpdir() + '\\\\dsh-damage-pulse-wechat-' + process.pid + '-' + Date.now() + '.txt'
      try {
        writeFileSync(file, message, 'utf8')
        await execFileAsync(process.execPath, [cliPath, 'send', '--file', file], { encoding: 'utf8', timeout: 30_000, windowsHide: true })
        return { ok: true, message: '微信通知已发送：' + message }
      } catch (error) {
        const detail = errorText(error)
      const code = /prepare|context[\s_-]?token|登录|扫码|激活|expired/i.test(detail) ? 'NOT_AUTHENTICATED' : /timeout|超时/i.test(detail) ? 'TIMEOUT' : 'CLI_ERROR'
        return { ok: false, code, message: '微信通知发送失败：' + detail }
      } finally { if (existsSync(file)) { try { unlinkSync(file) } catch {} } }
    },
    async status() { return cliPath ? { connected: true, authenticated: true, detail: '内置兼容适配器' } : { connected: false, authenticated: false, detail: '未配置 ClawBot CLI' } },
  }
}

export function adaptLegacyWechat(value: any): WechatProvider | undefined {
  if (!value || typeof value.send !== 'function') return undefined
  return {
    id: 'wechat', source: 'legacy', apiVersion: 'legacy',
    capabilities: { send: true, status: typeof value.status === 'function', login: false, reconnect: false, disconnect: false },
    async send(message) { try { const result = await value.send(message); return typeof result === 'object' && result?.ok !== undefined ? result : { ok: true, message: String(result ?? '微信通知已发送') } } catch (error) { return { ok: false, code: 'UNAVAILABLE', message: '旧版微信插件发送失败：' + errorText(error) } } },
    async status() { try { if (typeof value.status !== 'function') return { connected: true, detail: '旧版接口仅提供发送能力' }; const result = await value.status(); return { connected: Boolean(result?.connected ?? result?.ok ?? result), detail: '旧版微信插件' } } catch (error) { return { connected: false, detail: errorText(error) } } },
  }
}

export function discoverWechat(ctx: any, bundled: WechatProvider): WechatProvider {
  const candidates = [ctx?.wechatNotify, ctx?.wechatNotification, ctx?.services?.wechatNotify]
  for (const candidate of candidates) {
    if (candidate?.apiVersion && typeof candidate.send === 'function') return candidate as WechatProvider
    const legacy = adaptLegacyWechat(candidate)
    if (legacy) return legacy
  }
  return bundled
}

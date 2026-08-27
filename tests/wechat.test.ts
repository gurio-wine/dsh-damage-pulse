import test from 'node:test'
import assert from 'node:assert/strict'
import { Context } from '@deepseek-ai/cordis'
import {
  createTokenMonitorWechatProvider,
  provideTokenMonitorWechat,
} from '../plugins/dsh-token-monitor/src/wechat.ts'

function createWechatServices() {
  const calls = { send: 0, status: 0, login: 0, confirmLogin: 0, reconnect: 0, disconnect: 0 }
  const wechatNotify = {
    async send() {
      calls.send += 1
      return { ok: true as const }
    },
  }
  const wechatConnection = {
    async status() { calls.status += 1; return { auth: 'authenticated' as const, delivery: 'ready' as const } },
    async login() { calls.login += 1; return { sessionId: 'login-1', status: 'waiting' as const, qrPayload: 'qr' } },
    async confirmLogin() { calls.confirmLogin += 1; return { auth: 'authenticated' as const, delivery: 'ready' as const } },
    async reconnect() { calls.reconnect += 1; return { auth: 'authenticated' as const, delivery: 'ready' as const } },
    async disconnect() { calls.disconnect += 1; return { auth: 'disconnected' as const, delivery: 'unavailable' as const } },
  }
  return { calls, wechatNotify, wechatConnection }
}

test('compatibility provider delegates every operation to the bundled services exactly once', async () => {
  const services = createWechatServices()
  const provider = createTokenMonitorWechatProvider(services as unknown as Context)

  assert.deepEqual(await provider.send('hello'), { ok: true, message: '微信通知已发送' })
  await provider.status()
  await provider.login()
  await provider.confirmLogin('login-1')
  await provider.reconnect()
  await provider.disconnect(true)

  assert.deepEqual(services.calls, { send: 1, status: 1, login: 1, confirmLogin: 1, reconnect: 1, disconnect: 1 })
  assert.equal(provider.source, 'bundled')
})

test('send failure is adapted without hiding the stable bundled error code', async () => {
  const services = createWechatServices()
  services.wechatNotify.send = async () => ({
    ok: false as const,
    code: 'send-failed' as const,
    detail: '未配置 WECHAT_NOTIFY_CLAWBOT_INDEX',
  })
  const provider = createTokenMonitorWechatProvider(services as unknown as Context)
  assert.deepEqual(await provider.send('hello'), {
    ok: false,
    code: 'send-failed',
    message: '未配置 WECHAT_NOTIFY_CLAWBOT_INDEX',
  })
})

test('compatibility capability is registered and disposed by a Cordis plugin fiber', async () => {
  const ctx = new Context()
  const services = createWechatServices()
  const dependencies = ctx.plugin((pluginCtx) => {
    pluginCtx.provide('wechatNotify', services.wechatNotify)
    pluginCtx.provide('wechatConnection', services.wechatConnection)
  })
  await dependencies
  const fiber = ctx.plugin((pluginCtx) => {
    provideTokenMonitorWechat(pluginCtx)
  })

  await fiber
  assert.equal(ctx.tokenMonitorWechat.apiVersion, '1')
  assert.equal(ctx.tokenMonitorWechat.getProvider().source, 'bundled')

  await fiber.dispose()
  assert.equal(ctx.get('tokenMonitorWechat', false), undefined)
  await dependencies.dispose()
})

test('compatibility registration reuses an existing Cordis capability', async () => {
  const ctx = new Context()
  const services = createWechatServices()
  const provider = createTokenMonitorWechatProvider(services as unknown as Context)
  const existing = { apiVersion: '1' as const, getProvider: () => provider }
  const existingFiber = ctx.plugin(pluginCtx => pluginCtx.provide('tokenMonitorWechat', existing))
  await existingFiber

  let resolved: unknown
  const compatibilityFiber = ctx.plugin((pluginCtx) => {
    resolved = provideTokenMonitorWechat(pluginCtx)
  })
  await compatibilityFiber

  assert.equal(resolved, existing)
  assert.equal(ctx.tokenMonitorWechat, existing)
  await compatibilityFiber.dispose()
  assert.equal(ctx.tokenMonitorWechat, existing)
  await existingFiber.dispose()
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { Context } from '@deepseek-ai/cordis'
import {
  adaptLegacyWechat,
  createBundledWechatProvider,
  discoverWechat,
  provideTokenMonitorWechat,
} from '../plugins/dsh-token-monitor/src/wechat.ts'

test('bundled provider fails soft when ClawBot is not configured', async () => {
  const provider = createBundledWechatProvider(undefined)
  const result = await provider.send('hello')
  assert.equal(result.ok, false)
  assert.equal(result.code, 'NOT_CONFIGURED')
})

test('legacy provider is adapted without login takeover', async () => {
  const provider = adaptLegacyWechat({ send: async () => 'sent' })
  assert.ok(provider)
  assert.equal(provider.source, 'legacy')
  assert.equal(provider.capabilities.login, false)
  assert.equal((await provider.send('x')).ok, true)
})

test('provider discovery prefers external capability object', async () => {
  const external = { id: 'wechat', source: 'external', apiVersion: '1', capabilities: { send: true, status: true, login: true, reconnect: true, disconnect: true }, send: async () => ({ ok: true, message: 'ok' }), status: async () => ({ connected: true }) }
  const bundled = createBundledWechatProvider(undefined)
  assert.equal(discoverWechat({ wechatNotify: external }, bundled), external)
})

test('compatibility capability is registered and disposed by a real Cordis plugin fiber', async () => {
  const ctx = new Context()
  const bundled = createBundledWechatProvider(undefined)
  const plugin = (pluginCtx: Context) => {
    provideTokenMonitorWechat(pluginCtx, bundled)
  }
  const fiber = ctx.plugin(plugin)

  await fiber
  assert.equal(ctx.tokenMonitorWechat.apiVersion, '1')
  assert.equal(ctx.tokenMonitorWechat.getProvider(), bundled)

  await fiber.dispose()
  assert.equal(ctx.get('tokenMonitorWechat', false), undefined)
})

test('real Cordis discovery prefers a provided external capability', async () => {
  const ctx = new Context()
  const external = { id: 'wechat', source: 'external', apiVersion: '1', capabilities: { send: true, status: true, login: true, reconnect: true, disconnect: true }, send: async () => ({ ok: true, message: 'ok' }), status: async () => ({ connected: true }) } as const
  const bundled = createBundledWechatProvider(undefined)
  const externalFiber = ctx.plugin((pluginCtx) => {
    pluginCtx.provide('wechatNotify', external)
  })
  await externalFiber
  const capabilityFiber = ctx.plugin((pluginCtx) => {
    provideTokenMonitorWechat(pluginCtx, bundled)
  })
  await capabilityFiber

  assert.equal(ctx.tokenMonitorWechat.getProvider(), external)

  await capabilityFiber.dispose()
  await externalFiber.dispose()
})

test('real Cordis discovery adapts a provided legacy sender', async () => {
  const ctx = new Context()
  const legacy = { send: async () => 'sent' }
  const bundled = createBundledWechatProvider(undefined)
  const legacyFiber = ctx.plugin((pluginCtx) => {
    pluginCtx.provide('wechatNotification', legacy)
  })
  await legacyFiber
  const capabilityFiber = ctx.plugin((pluginCtx) => {
    provideTokenMonitorWechat(pluginCtx, bundled)
  })
  await capabilityFiber

  const provider = ctx.tokenMonitorWechat.getProvider()
  assert.equal(provider.source, 'legacy')
  assert.equal((await provider.send('hello')).ok, true)

  await capabilityFiber.dispose()
  await legacyFiber.dispose()
})

test('compatibility registration reuses an existing Cordis capability', async () => {
  const ctx = new Context()
  const bundled = createBundledWechatProvider(undefined)
  const existing = { apiVersion: '1', getProvider: () => bundled } as const
  const existingFiber = ctx.plugin((pluginCtx) => {
    pluginCtx.provide('tokenMonitorWechat', existing)
  })
  await existingFiber

  let resolved: unknown
  const compatibilityFiber = ctx.plugin((pluginCtx) => {
    resolved = provideTokenMonitorWechat(pluginCtx, bundled)
  })
  await compatibilityFiber

  assert.equal(resolved, existing)
  assert.equal(ctx.tokenMonitorWechat, existing)

  await compatibilityFiber.dispose()
  assert.equal(ctx.tokenMonitorWechat, existing)
  await existingFiber.dispose()
})

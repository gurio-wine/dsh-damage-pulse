import test from 'node:test'
import assert from 'node:assert/strict'
import { adaptLegacyWechat, createBundledWechatProvider, discoverWechat } from '../plugins/dsh-token-monitor/src/wechat.ts'

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

import test from 'node:test'
import assert from 'node:assert/strict'
import { Context } from '@deepseek-ai/cordis'
import * as tokenMonitorPlugin from '../lib/index.js'

test('built host plugin starts in a real Cordis 4 fiber and exposes its WeChat capability', async () => {
  const ctx = new Context()
  const dependencies = ctx.plugin((pluginCtx) => {
    pluginCtx.provide('sessions', {})
    pluginCtx.provide('credentials', { resolve: async () => undefined })
  })
  await dependencies

  const pluginFiber = ctx.plugin(tokenMonitorPlugin)
  await pluginFiber

  assert.equal(ctx.tokenMonitorWechat.apiVersion, '1')
  assert.equal(ctx.tokenMonitorWechat.getProvider().source, 'bundled')

  await pluginFiber.dispose()
  await dependencies.dispose()
})

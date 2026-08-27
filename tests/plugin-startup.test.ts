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

test('built plugin starts fail-soft on an empty context (no sessions/credentials provided, issue #9)', async () => {
  const ctx = new Context()
  const pluginFiber = ctx.plugin(tokenMonitorPlugin)
  const deadline = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('plugin start hung on an empty context')), 5000)
  })
  // 空 Context（未提供 sessions/credentials/wechatNotify 等）也必须可启动、可释放，
  // 不允许把宿主拖崩或永久挂起。
  await Promise.race([pluginFiber, deadline])
  await pluginFiber.dispose()
})

test('stays dormant until sessions/credentials arrive, then activates (community host late services)', async () => {
  const ctx = new Context()
  const pluginFiber = ctx.plugin(tokenMonitorPlugin)
  const deadline = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('dormant plugin fiber did not resolve')), 5000)
  })
  // 社区宿主缺核心服务时：inject 强制休眠，apply 不执行、不抛错、不阻塞宿主启动。
  await Promise.race([pluginFiber, deadline])
  assert.equal(ctx.get('tokenMonitorWechat', false), undefined)

  // 宿主随后补齐 sessions/credentials：插件应自动激活并自带内置微信服务。
  const lateDependencies = ctx.plugin((pluginCtx) => {
    pluginCtx.provide('sessions', {})
    pluginCtx.provide('credentials', { resolve: async () => undefined })
  })
  await lateDependencies
  await new Promise((resolve) => setTimeout(resolve, 50))

  assert.equal(ctx.tokenMonitorWechat.apiVersion, '1')
  assert.equal(ctx.tokenMonitorWechat.getProvider().source, 'bundled')

  await pluginFiber.dispose()
  await lateDependencies.dispose()
})

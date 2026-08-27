import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const ROOT = new URL('../', import.meta.url)

function readRelative(relativePath: string): string {
  return readFileSync(new URL(relativePath, ROOT), 'utf8')
}

const manifestText = readRelative('package.json')
const manifest = JSON.parse(manifestText) as { version: string; devDependencies: Record<string, string> }
const panelSource = readRelative('packages/client/ui-token-monitor/src/client/TokenMonitorSettingsPanel.tsx')
const updateSource = readRelative('plugins/dsh-token-monitor/src/update.ts')

test('root package.json devDependencies declare @deepseek-ai/dsh-llm exactly once', () => {
  const devSection = manifestText.split('"devDependencies"')[1]
  assert.equal(devSection.split('"@deepseek-ai/dsh-llm"').length - 1, 1)
  assert.equal(manifest.devDependencies['@deepseek-ai/dsh-llm'], '0.1.0-rc.7')
})

test('client version fallback and Host CURRENT_RELEASE_VERSION match the root package version', () => {
  const versionParts = manifest.version.split('.')
  assert.equal(versionParts.length, 3)
  for (const part of versionParts) assert.ok(Number.isInteger(Number(part)))

  const fallbackAnchor = "updateStatus?.currentVersion ?? '"
  const fallbackStart = panelSource.indexOf(fallbackAnchor)
  assert.ok(fallbackStart >= 0, '设置面板应保留 updateStatus 未加载时的版本兜底')
  assert.equal(panelSource.slice(fallbackStart + fallbackAnchor.length, fallbackStart + fallbackAnchor.length + manifest.version.length), manifest.version)

  const currentAnchor = "CURRENT_RELEASE_VERSION = '"
  const currentStart = updateSource.indexOf(currentAnchor)
  assert.ok(currentStart >= 0, 'update.ts 应导出 CURRENT_RELEASE_VERSION 常量')
  assert.equal(updateSource.slice(currentStart + currentAnchor.length, currentStart + currentAnchor.length + manifest.version.length), manifest.version)
})

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'
import {
  registerTokenMonitorAssetRoutes,
  registerWhaleAssetRoute,
  resolveTokenMonitorAssetRoot,
} from '../src/assets.ts'

type AssetRoute = {
  kind: string
  path: string
  handler: (req: { method: string; url?: string }, res: { writeHead: Mock; end: Mock }) => Promise<void>
}

function captureRoutes(register: (ctx: unknown) => void): AssetRoute[] {
  const routes: AssetRoute[] = []
  const ctx = { webServer: { register: (route: AssetRoute) => routes.push(route) } }
  register(ctx)
  return routes
}

function invoke(route: AssetRoute, url: string, method = 'GET') {
  const writeHead = vi.fn()
  const end = vi.fn()
  const request = { method, url }
  const response = { writeHead, end }
  return route.handler(request as never, response as never).then(() => ({ writeHead, end }))
}

function statusOf(result: { writeHead: Mock }): number {
  return result.writeHead.mock.calls[0]?.[0] ?? -1
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('token monitor asset root resolution', () => {
  it('resolves the same repo-root asset directory from source and bundled faces', () => {
    const sourceUrl = import.meta.url
    const bundledUrl = new URL('../lib/index.js', sourceUrl).href
    const fromSource = resolveTokenMonitorAssetRoot(sourceUrl)
    const fromBundled = resolveTokenMonitorAssetRoot(bundledUrl)
    expect(fromBundled).toBe(fromSource)
    // 仓库根素材目录必须真实存在（whale-girl 至少包含 idle.png）。
    expect(existsSync(join(fromSource, 'whale-girl', 'idle.png'))).toBe(true)
  })
})

describe('token monitor asset routes', () => {
  it('registers whale-girl and settings-ui/cute prefixes', () => {
    const routes = captureRoutes(registerTokenMonitorAssetRoutes)
    expect(routes.map(route => route.path)).toEqual([
      '/assets/dsh-token-monitor/whale-girl',
      '/assets/dsh-token-monitor/settings-ui/cute',
    ])
  })

  it('keeps the backward-compatible whale-only entry', () => {
    const routes = captureRoutes(registerWhaleAssetRoute)
    expect(routes).toHaveLength(1)
    expect(routes[0]?.path).toBe('/assets/dsh-token-monitor/whale-girl')
  })

  it('serves an existing PNG with immutable caching', async () => {
    const [route] = captureRoutes(registerTokenMonitorAssetRoutes)
    const result = await invoke(route!, '/assets/dsh-token-monitor/whale-girl/idle.png')
    expect(statusOf(result)).toBe(200)
    expect(result.writeHead.mock.calls[0]?.[1]).toMatchObject({
      'Content-Type': 'image/png',
      'X-Content-Type-Options': 'nosniff',
    })
    const body: Uint8Array = result.end.mock.calls[0]?.[0]
    expect(body?.byteLength ?? 0).toBeGreaterThan(0)
  })

  it('answers HEAD without a body', async () => {
    const [route] = captureRoutes(registerTokenMonitorAssetRoutes)
    const result = await invoke(route!, '/assets/dsh-token-monitor/whale-girl/idle.png', 'HEAD')
    expect(statusOf(result)).toBe(200)
    expect(result.end.mock.calls[0]?.[0]).toBeUndefined()
  })

  it('rejects path traversal outside the asset root', async () => {
    const [route] = captureRoutes(registerTokenMonitorAssetRoutes)
    const traversal = '/assets/dsh-token-monitor/whale-girl/../../package.json'
    const result = await invoke(route!, traversal)
    expect(statusOf(result)).toBe(404)
  })

  it('rejects non-PNG and missing files with 404 without crashing', async () => {
    const [route] = captureRoutes(registerTokenMonitorAssetRoutes)
    const missing = await invoke(route!, '/assets/dsh-token-monitor/whale-girl/does-not-exist.png')
    expect(statusOf(missing)).toBe(404)
    const notPng = await invoke(route!, '/assets/dsh-token-monitor/whale-girl/idle.txt')
    expect(statusOf(notPng)).toBe(404)
  })

  it('rejects non-GET/HEAD methods with 405', async () => {
    const [route] = captureRoutes(registerTokenMonitorAssetRoutes)
    const result = await invoke(route!, '/assets/dsh-token-monitor/whale-girl/idle.png', 'POST')
    expect(statusOf(result)).toBe(405)
    expect(result.writeHead.mock.calls[0]?.[1]).toMatchObject({ Allow: 'GET, HEAD' })
  })
})

import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-host-webserver'

const REPO_ROOT_MARKERS = ['packages', 'assets'] as const

/**
 * 从模块所在目录向上查找仓库根（同时包含 packages/ 与 assets/ 的目录）。
 * 兼容两种运行面：源码直跑（src/assets.ts，tsx/vitest）与打包产物（lib/index.js），
 * 二者都从插件目录向上 2 层到达仓库根，保证素材定位一致。
 */
export function resolveTokenMonitorAssetRoot(moduleUrl: string = import.meta.url): string {
  let dir = dirname(fileURLToPath(moduleUrl))
  for (let depth = 0; depth < 8; depth += 1) {
    if (REPO_ROOT_MARKERS.every(marker => existsSync(join(dir, marker)))) {
      return join(dir, 'assets', 'dsh-token-monitor')
    }
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  // 兜底：社区把素材放在插件包内 plugins/dsh-token-monitor/assets/ 的场景。
  return resolve(dirname(fileURLToPath(moduleUrl)), '..', 'assets', 'dsh-token-monitor')
}

const ASSET_ROOT = resolveTokenMonitorAssetRoot()
const ROUTES = [
  { route: '/assets/dsh-token-monitor/whale-girl', directory: 'whale-girl' },
  { route: '/assets/dsh-token-monitor/settings-ui/cute', directory: 'settings-ui/cute' },
] as const

function assetHandler(route: string, directory: string) {
  const root = resolve(ASSET_ROOT, directory)
  return async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { Allow: 'GET, HEAD', 'Cache-Control': 'no-store' })
      response.end()
      return
    }
    let pathname: string
    try {
      pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname)
    } catch {
      response.writeHead(400, { 'Cache-Control': 'no-store' })
      response.end()
      return
    }
    const requested = pathname.startsWith(`${route}/`) ? pathname.slice(route.length + 1) : ''
    if (!requested.endsWith('.png') || requested.split('/').some(part => !/^[A-Za-z0-9._-]+$/.test(part))) {
      response.writeHead(404, { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' })
      response.end()
      return
    }
    const target = resolve(root, ...requested.split('/'))
    const local = relative(root, target)
    if (local.startsWith(`..${sep}`) || local === '..' || local === '') {
      response.writeHead(404, { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' })
      response.end()
      return
    }
    try {
      const body = await readFile(target)
      response.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Length': body.byteLength,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      })
      response.end(request.method === 'HEAD' ? undefined : body)
    } catch {
      response.writeHead(404, { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' })
      response.end()
    }
  }
}

/** Register the two package-owned PNG trees required by the Client. */
export function registerTokenMonitorAssetRoutes(ctx: Context): void {
  for (const entry of ROUTES) {
    ctx.webServer.register({ kind: 'prefix', path: entry.route, handler: assetHandler(entry.route, entry.directory) })
  }
}

/** Backward-compatible entry point that retains the original single-route behavior. */
export function registerWhaleAssetRoute(ctx: Context): void {
  const entry = ROUTES[0]
  ctx.webServer.register({ kind: 'prefix', path: entry.route, handler: assetHandler(entry.route, entry.directory) })
}

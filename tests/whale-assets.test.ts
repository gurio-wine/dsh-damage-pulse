import assert from 'node:assert/strict'
import { test } from 'node:test'
import { registerWhaleAssetRoute } from '../lib/index.js'

type CapturedResponse = {
  status?: number
  headers?: Record<string, string | number>
  body?: unknown
}

function captureHandler() {
  let handler: ((req: { method?: string; url?: string }, res: unknown) => Promise<void>) | undefined
  const ctx = {
    webServer: {
      register(route: { handler: typeof handler }) {
        handler = route.handler
      },
    },
  }
  registerWhaleAssetRoute(ctx as never)
  assert.ok(handler)
  return handler
}

async function request(method: string, url: string): Promise<CapturedResponse> {
  const result: CapturedResponse = {}
  const res = {
    writeHead(status: number, headers?: Record<string, string | number>) {
      result.status = status
      result.headers = headers
    },
    end(body?: unknown) {
      result.body = body
    },
  }
  await captureHandler()({ method, url }, res)
  return result
}

test('serves an allowlisted whale PNG with immutable nosniff headers', async () => {
  const response = await request('GET', '/assets/dsh-token-monitor/whale-girl/idle-v4-r2/idle-01.png')
  assert.equal(response.status, 200)
  assert.equal(response.headers?.['Content-Type'], 'image/png')
  assert.equal(response.headers?.['X-Content-Type-Options'], 'nosniff')
  assert.match(String(response.headers?.['Cache-Control']), /immutable/)
  assert.ok(Buffer.isBuffer(response.body))
})

test('serves the fixed-mother severe expression assets', async () => {
  const response = await request(
    'GET',
    '/assets/dsh-token-monitor/whale-girl/feedback-expression-v4-r5-critical-model/frames/critical-overflow.png',
  )
  assert.equal(response.status, 200)
  assert.equal(response.headers?.['Content-Type'], 'image/png')
  assert.ok(Buffer.isBuffer(response.body))
})

test('supports HEAD without returning the PNG body', async () => {
  const response = await request('HEAD', '/assets/dsh-token-monitor/whale-girl/idle-v4-r2/idle-01.png')
  assert.equal(response.status, 200)
  assert.equal(response.body, undefined)
  assert.ok(Number(response.headers?.['Content-Length']) > 0)
})

test('rejects traversal, unknown files and unsupported methods', async () => {
  assert.equal((await request('GET', '/assets/dsh-token-monitor/whale-girl/%2e%2e/package.json')).status, 404)
  assert.equal((await request('GET', '/assets/dsh-token-monitor/whale-girl/idle-v4-r2/not-allowed.png')).status, 404)
  assert.equal((await request('POST', '/assets/dsh-token-monitor/whale-girl/idle-v4-r2/idle-01.png')).status, 405)
})

test('rejects malformed URL encoding without exposing an error', async () => {
  const response = await request('GET', '/assets/dsh-token-monitor/whale-girl/%E0%A4%A')
  assert.equal(response.status, 400)
  assert.equal(response.body, undefined)
})

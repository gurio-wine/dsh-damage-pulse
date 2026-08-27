import {
  parseTokenMonitorSettingsSnapshot,
  type TokenMonitorSettingsErrorCode,
  type TokenMonitorSettingsPatchRequest,
  type TokenMonitorSettingsSnapshot,
} from '../../../../util/token-monitor-contract/src/index.ts'

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export class TokenMonitorSettingsApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: TokenMonitorSettingsErrorCode | 'HTTP_ERROR',
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message)
    this.name = 'TokenMonitorSettingsApiError'
  }
}

export class TokenMonitorSettingsProtocolError extends Error {
  constructor(readonly fields: Record<string, string>) {
    super('Token Monitor 设置接口返回了不符合契约的数据')
    this.name = 'TokenMonitorSettingsProtocolError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseErrorResponse(status: number, value: unknown): TokenMonitorSettingsApiError {
  if (!isRecord(value) || !isRecord(value.error)) {
    return new TokenMonitorSettingsApiError(status, 'HTTP_ERROR', `Token Monitor 设置请求失败（HTTP ${String(status)}）`)
  }
  const error = value.error
  const code = typeof error.code === 'string' ? error.code : 'HTTP_ERROR'
  const message = typeof error.message === 'string'
    ? error.message
    : `Token Monitor 设置请求失败（HTTP ${String(status)}）`
  const details = isRecord(error.details) ? error.details : undefined
  const rawFields = details !== undefined && isRecord(details.fields) ? details.fields : undefined
  const fields = rawFields === undefined
    ? undefined
    : Object.fromEntries(Object.entries(rawFields).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
  const allowedCodes: readonly TokenMonitorSettingsErrorCode[] = [
    'METHOD_NOT_ALLOWED',
    'INVALID_JSON',
    'PAYLOAD_TOO_LARGE',
    'UNSUPPORTED_MEDIA_TYPE',
    'VALIDATION_ERROR',
    'CONFLICT',
    'WRITE_FAILED',
  ]
  return new TokenMonitorSettingsApiError(
    status,
    allowedCodes.includes(code as TokenMonitorSettingsErrorCode) ? code as TokenMonitorSettingsErrorCode : 'HTTP_ERROR',
    message,
    fields,
  )
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    if (!response.ok) throw new TokenMonitorSettingsApiError(
      response.status,
      'HTTP_ERROR',
      `Token Monitor 设置请求失败（HTTP ${String(response.status)}）`,
    )
    throw new TokenMonitorSettingsProtocolError({ response: '响应不是有效 JSON' })
  }
}

async function parseResponse(response: Response): Promise<TokenMonitorSettingsSnapshot> {
  const value = await readJson(response)
  if (!response.ok) throw parseErrorResponse(response.status, value)
  const parsed = parseTokenMonitorSettingsSnapshot(value)
  if (!parsed.ok) throw new TokenMonitorSettingsProtocolError(parsed.fields)
  return parsed.value
}

export interface TokenMonitorSettingsApi {
  get(signal?: AbortSignal): Promise<TokenMonitorSettingsSnapshot>
  patch(request: TokenMonitorSettingsPatchRequest, signal?: AbortSignal): Promise<TokenMonitorSettingsSnapshot>
}

/** Browser-safe client for the dedicated Token Monitor settings endpoint. */
export function createTokenMonitorSettingsApi(
  fetcher: FetchLike = fetch,
  endpoint = '/api/token-monitor/settings',
): TokenMonitorSettingsApi {
  return {
    async get(signal) {
      return parseResponse(await fetcher(endpoint, {
        cache: 'no-store',
        ...(signal === undefined ? {} : { signal }),
      }))
    },
    async patch(request, signal) {
      return parseResponse(await fetcher(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        cache: 'no-store',
        ...(signal === undefined ? {} : { signal }),
      }))
    },
  }
}

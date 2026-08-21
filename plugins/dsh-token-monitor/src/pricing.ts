/**
 * DeepSeek 峰谷定价价格表与计费引擎。
 * 价格表版本：2026-08-21（按官方页面当前内容核对）。
 * 来源：https://api-docs.deepseek.com/zh-cn/quick_start/pricing/
 * 单位：元 / 百万 tokens。
 */

/** 单个时段的模型价格（DeepSeek 官方三字段）。 */
export interface ModelPrice {
  /** 输入（缓存未命中）价格。 */
  input: number
  /** 输入（缓存命中）价格。 */
  cacheHit: number
  /** 输出价格（已含 reasoning）。 */
  output: number
}

export interface PricingTable {
  models: Record<string, { peak: ModelPrice; offPeak: ModelPrice }>
  /** 高峰时段（北京时间，24 小时制半开区间），如 [[9, 12], [14, 18]]。 */
  peakHours: Array<[number, number]>
  /** 价格表版本，用于提示用户「价格已过期」。 */
  version: string
}

/** 2026-08-21 核对的当前官方峰谷价格（单位：元 / 百万 tokens）。 */
export const PRICE_TABLE: PricingTable = {
  version: '2026-08-21',
  // 高峰时段：北京时间 9:00-12:00、14:00-18:00（半开区间）。
  peakHours: [[9, 12], [14, 18]],
  models: {
    // Vision Exp 的图片会先折算为 prompt tokens，并随文本输入一起进入 usage；
    // 因此这里与官方表中的 Flash 使用同一组输入/输出单价，不额外增加图片费率。
    'deepseek-v4-flash-vision-exp': {
      offPeak: { input: 1.5, cacheHit: 0.05, output: 4.5 },
      peak: { input: 3.0, cacheHit: 0.10, output: 9.0 },
    },
    'deepseek-v4-flash': {
      offPeak: { input: 1.5, cacheHit: 0.05, output: 4.5 },
      peak: { input: 3.0, cacheHit: 0.10, output: 9.0 },
    },
    'deepseek-v4-pro': {
      offPeak: { input: 4.5, cacheHit: 0.15, output: 13.5 },
      peak: { input: 9.0, cacheHit: 0.30, output: 27.0 },
    },
  },
}

/**
 * 2026-08-17 00:00（北京时间）前的旧价格：统一价，无峰谷。
 * 峰值/谷值填同一组价格 + 空 peakHours，使 `isPeakHour` 恒为假、始终按 offPeak 计价。
 */
export const LEGACY_PRICE_TABLE: PricingTable = {
  version: 'legacy-before-2026-08-17',
  peakHours: [],
  models: {
    'deepseek-v4-flash-vision-exp': {
      offPeak: { input: 1.0, cacheHit: 0.02, output: 2.0 },
      peak: { input: 1.0, cacheHit: 0.02, output: 2.0 },
    },
    'deepseek-v4-flash': {
      offPeak: { input: 1.0, cacheHit: 0.02, output: 2.0 },
      peak: { input: 1.0, cacheHit: 0.02, output: 2.0 },
    },
    'deepseek-v4-pro': {
      offPeak: { input: 3.0, cacheHit: 0.025, output: 6.0 },
      peak: { input: 3.0, cacheHit: 0.025, output: 6.0 },
    },
  },
}

/**
 * 峰谷新价格生效时刻：2026-08-17 00:00 北京时间 = 2026-08-16 16:00 UTC。
 * 此前的调用按旧统一价计价，此后按峰谷价计价。
 */
const PEAK_PRICING_START = Date.UTC(2026, 7, 16, 16, 0, 0)

/** 按时间戳选择价格表：8-17 前用旧统一价，之后用（可配置的）峰谷价。 */
export function selectPriceTable(ts: number, table: PricingTable = PRICE_TABLE): PricingTable {
  return ts < PEAK_PRICING_START ? LEGACY_PRICE_TABLE : table
}

/** 单次调用的费用明细。 */
export interface CostBreakdown {
  costInput: number
  costCache: number
  /** 缓存命中读取费用（costCache 的组成部分）。 */
  costCacheRead: number
  /** 缓存写入费用（按输入单价计价，costCache 的组成部分）。 */
  costCacheWrite: number
  costOutput: number
  cost: number
  peak: boolean
}

/** 未命中价格表时的安全默认价（取 flash 高峰价，偏高不偏少）。 */
const FALLBACK: ModelPrice = { input: 3.0, cacheHit: 0.10, output: 9.0 }

/** 取时间戳对应的北京时间小时（0-23）；解析失败返回 -1。 */
export function beijingHour(ts: number): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Shanghai',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(new Date(ts))
  const hour = parts.find((p) => p.type === 'hour')?.value
  return hour === undefined ? -1 : Number(hour)
}

/** 判断时间戳是否落在高峰时段（半开区间 [start, end)）。 */
export function isPeakHour(ts: number, peakHours: Array<[number, number]>): boolean {
  const hour = beijingHour(ts)
  return peakHours.some(([start, end]) => hour >= start && hour < end)
}

/**
 * 归一化模型名后查价：直接命中优先，否则按最长前缀匹配，
 * 使 `deepseek-v4-flash-vision-exp-2026` 不会被较短的 Flash 前缀抢先匹配。
 */
export function resolveModelPrice(
  model: string,
  table: PricingTable,
): { peak: ModelPrice; offPeak: ModelPrice } | undefined {
  const direct = table.models[model]
  if (direct !== undefined) return direct
  for (const [name, price] of Object.entries(table.models).sort(([a], [b]) => b.length - a.length)) {
    if (model.startsWith(name)) return price
  }
  return undefined
}

/**
 * 按 (token 数, 模型, 时间戳) 计算一次调用的费用。
 * 缓存命中（cacheReadTokens）按 cacheHit 价；缓存写入（cacheWriteTokens）并入缓存未命中价。
 */
export function priceUsage(
  inputTokens: number,
  cacheReadTokens: number,
  cacheWriteTokens: number,
  outputTokens: number,
  model: string,
  ts: number,
  table: PricingTable = PRICE_TABLE,
): CostBreakdown {
  // 按时间戳选择生效价格表：8-17 前旧统一价，之后峰谷价（settings 可覆盖后者）。
  const active = selectPriceTable(ts, table)
  const resolved = resolveModelPrice(model, active)
  const peak = isPeakHour(ts, active.peakHours)
  const rate = peak ? (resolved?.peak ?? FALLBACK) : (resolved?.offPeak ?? FALLBACK)
  const costInput = (inputTokens / 1e6) * rate.input
  const costCacheRead = (cacheReadTokens / 1e6) * rate.cacheHit
  const costCacheWrite = (cacheWriteTokens / 1e6) * rate.input
  const costCache = costCacheRead + costCacheWrite
  const costOutput = (outputTokens / 1e6) * rate.output
  return {
    costInput,
    costCache,
    costCacheRead,
    costCacheWrite,
    costOutput,
    cost: costInput + costCache + costOutput,
    peak,
  }
}

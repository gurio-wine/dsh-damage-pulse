import { describe, expect, it } from 'vitest'
import {
  DEFAULT_TOKEN_MONITOR_SETTINGS,
  DEFAULT_TRUE_BOOLEAN_KEYS,
  TOKEN_MONITOR_SETTING_KEYS,
  TOKEN_MONITOR_SETTINGS_SCHEMA_VERSION,
  UnsupportedTokenMonitorSettingsVersionError,
  parseTokenMonitorSettingsPatchRequest,
  parseTokenMonitorSettingsSnapshot,
  pickPublicTokenMonitorSettings,
  planTokenMonitorSettingsMigration,
} from '../src/index.ts'

describe('token monitor settings contract', () => {
  it('accepts the canonical snapshot and detaches public fields', () => {
    const snapshot = {
      schemaVersion: TOKEN_MONITOR_SETTINGS_SCHEMA_VERSION,
      revision: 3,
      settings: { ...DEFAULT_TOKEN_MONITOR_SETTINGS },
    }
    expect(parseTokenMonitorSettingsSnapshot(snapshot)).toEqual({ ok: true, value: snapshot })
    expect(pickPublicTokenMonitorSettings({ ...snapshot.settings, priceTable: { secret: true } }))
      .toEqual(snapshot.settings)
  })

  it('accepts partial patches with optimistic concurrency', () => {
    expect(parseTokenMonitorSettingsPatchRequest({
      expectedRevision: 7,
      patch: { displayMode: 'spend', showWhaleGirl: false, dailyBudgetCny: 88.88 },
    })).toEqual({
      ok: true,
      value: { expectedRevision: 7, patch: { displayMode: 'spend', showWhaleGirl: false, dailyBudgetCny: 88.88 } },
    })
  })

  it.each([
    [{ patch: { unknown: true } }, 'patch.unknown'],
    [{ patch: { dailyBudgetCny: 1.234 } }, 'patch.dailyBudgetCny'],
    [{ patch: { dailyBudgetCny: Number.POSITIVE_INFINITY } }, 'patch.dailyBudgetCny'],
    [{ patch: { displayMode: 'other' } }, 'patch.displayMode'],
    [{ expectedRevision: -1, patch: {} }, 'expectedRevision'],
    [JSON.parse('{"patch":{"__proto__":true}}'), 'patch.__proto__'],
  ])('rejects invalid or dangerous input at %s', (input, field) => {
    const result = parseTokenMonitorSettingsPatchRequest(input)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.fields).toHaveProperty(field)
  })

  it('plans legacy migration and refuses a newer schema', () => {
    const notificationDefaults = {
      budgetExceededNotificationEnabled: false,
      peakReminderEnabled: false,
      peakReminderEnterPeak: false,
      peakReminderEnterValley: false,
      notifyOncePerTransition: false,
      whaleBubbleEnabled: false,
      wechatNotificationsEnabled: false,
      cacheHitAnomalyNotificationEnabled: false,
    }
    for (const schemaVersion of [undefined, 0, 1, 2]) {
      const user = schemaVersion === undefined ? { dailyBudgetCny: 10 } : { schemaVersion }
      expect(planTokenMonitorSettingsMigration(user)).toEqual({ schemaVersion: 3, ...notificationDefaults })
    }
    expect(planTokenMonitorSettingsMigration({ schemaVersion: 3 })).toEqual(notificationDefaults)
    expect(planTokenMonitorSettingsMigration({ schemaVersion: 3, ...notificationDefaults })).toBeUndefined()
    expect(() => planTokenMonitorSettingsMigration({ schemaVersion: 4 }))
      .toThrow(UnsupportedTokenMonitorSettingsVersionError)
  })

  it('locks every notification switch to default off', () => {
    const notificationSwitches = [
      'budgetExceededNotificationEnabled',
      'peakReminderEnabled',
      'peakReminderEnterPeak',
      'peakReminderEnterValley',
      'notifyOncePerTransition',
      'whaleBubbleEnabled',
      'wechatNotificationsEnabled',
      'cacheHitAnomalyNotificationEnabled',
    ] as const
    for (const key of notificationSwitches) {
      expect(DEFAULT_TOKEN_MONITOR_SETTINGS[key]).toBe(false)
    }
    // 除 UI 开关 showWhaleGirl 外，任何布尔设置默认都必须为 false，
    // 防止将来新增通知/提醒开关时默认开启（公测版策略：通知开关默认全部关闭）。
    for (const key of TOKEN_MONITOR_SETTING_KEYS) {
      if (typeof DEFAULT_TOKEN_MONITOR_SETTINGS[key] === 'boolean' && !DEFAULT_TRUE_BOOLEAN_KEYS.includes(key)) {
        expect(DEFAULT_TOKEN_MONITOR_SETTINGS[key]).toBe(false)
      }
    }
    for (const key of DEFAULT_TRUE_BOOLEAN_KEYS) {
      expect(DEFAULT_TOKEN_MONITOR_SETTINGS[key]).toBe(true)
    }
    expect(Object.isFrozen(DEFAULT_TOKEN_MONITOR_SETTINGS)).toBe(true)
  })

  it('validates cache anomaly settings at their boundaries', () => {
    expect(parseTokenMonitorSettingsPatchRequest({ patch: { cacheHitAnomalyThreshold: 0, cacheHitAnomalyConsecutiveCalls: 20 } }).ok).toBe(true)
    for (const value of [-1, 101, 30.5]) {
      expect(parseTokenMonitorSettingsPatchRequest({ patch: { cacheHitAnomalyThreshold: value } }).ok).toBe(false)
    }
    for (const value of [1, 21, 3.5]) {
      expect(parseTokenMonitorSettingsPatchRequest({ patch: { cacheHitAnomalyConsecutiveCalls: value } }).ok).toBe(false)
    }
  })
})

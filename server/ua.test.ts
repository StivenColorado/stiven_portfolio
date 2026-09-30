import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseUA } from './ua.ts'

const cases: Array<[string, string, Parameters<typeof parseUA>[1], boolean, string, string]> = [
  ['Windows Chrome', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36', {}, false, 'windows', 'desktop'],
  ['macOS Safari', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15', {}, false, 'macos', 'desktop'],
  ['iPad (Mac + touch)', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15', {}, true, 'ios', 'tablet'],
  ['iPad UA clásico', 'Mozilla/5.0 (iPad; CPU OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1', {}, true, 'ios', 'tablet'],
  ['iPhone', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1', {}, true, 'ios', 'mobile'],
  ['Android móvil', 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36', {}, true, 'android', 'mobile'],
  ['Android tablet', 'Mozilla/5.0 (Linux; Android 13; SM-X700) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36', {}, true, 'android', 'tablet'],
  ['Googlebot', 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)', {}, false, 'other', 'bot'],
  ['curl', 'curl/8.5.0', {}, false, 'other', 'bot'],
  ['Lighthouse', 'Mozilla/5.0 (Linux; Android 11; moto g power) AppleWebKit/537.36 Chrome/119.0.0.0 Mobile Safari/537.36 Chrome-Lighthouse', {}, false, 'android', 'bot'],
  ['Linux Firefox', 'Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0', {}, false, 'linux', 'desktop'],
  ['hint de plataforma manda', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36', { platform: '"Windows"', mobile: '?0' }, false, 'windows', 'desktop'],
  ['hint móvil', 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36', { platform: '"Android"', mobile: '?1' }, false, 'android', 'mobile'],
  ['UA vacío', '', {}, false, 'other', 'desktop'],
]

for (const [name, ua, hints, touch, os, device] of cases) {
  test(name, () => assert.deepEqual(parseUA(ua, hints, touch), { os, device }))
}

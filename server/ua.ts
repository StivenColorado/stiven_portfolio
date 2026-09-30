export type OS = 'windows' | 'macos' | 'android' | 'ios' | 'linux' | 'other'
export type Device = 'mobile' | 'tablet' | 'desktop' | 'bot'

const BOT = /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|whatsapp|telegram|curl|wget|python-requests/i

function osFromHint(platform: string): OS | null {
  const p = platform.replace(/"/g, '').trim().toLowerCase()
  if (p === 'windows') return 'windows'
  if (p === 'macos') return 'macos'
  if (p === 'android') return 'android'
  if (p === 'ios') return 'ios'
  if (p === 'linux' || p === 'chrome os' || p === 'chromeos') return 'linux'
  return null
}

function osFromUA(ua: string): OS {
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios'
  if (/Android/.test(ua)) return 'android'
  if (/Windows NT/.test(ua)) return 'windows'
  if (/Mac OS X/.test(ua)) return 'macos'
  if (/Linux|X11/.test(ua)) return 'linux'
  return 'other'
}

/** iPadOS Safari se presenta como Macintosh; `touch` (maxTouchPoints > 1) la desambigua. */
export function parseUA(
  ua: string,
  hints: { platform?: string; mobile?: string } = {},
  touch = false,
): { os: OS; device: Device } {
  let os = (hints.platform && osFromHint(hints.platform)) || osFromUA(ua)
  const macTouch = os === 'macos' && touch
  if (macTouch) os = 'ios'

  if (BOT.test(ua)) return { os, device: 'bot' }
  if (macTouch || /iPad|Tablet/i.test(ua)) return { os, device: 'tablet' }
  if (hints.mobile === '?1' || /Mobile|iPhone/.test(ua)) return { os, device: 'mobile' }
  if (/Android/.test(ua)) return { os, device: 'tablet' }
  return { os, device: 'desktop' }
}

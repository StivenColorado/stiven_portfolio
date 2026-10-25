export type Block =
  | { type: 'h1' | 'h2' | 'p' | 'li'; text: string; num?: string }
  | { type: 'table'; header: boolean; rows: string[][] }
export type VarType = 'text' | 'textarea' | 'number' | 'money' | 'date'
export type ContractLang = 'es' | 'en'

export const VAR_RE = /\{\{([a-z][a-z0-9_]*)\}\}/g

export function extractVars(body: string): string[] {
  const seen = new Set<string>()
  for (const m of body.matchAll(VAR_RE)) seen.add(m[1] as string)
  return [...seen]
}

export function formatValue(value: string, type: VarType | string, lang: ContractLang = 'es', currency = 'COP'): string {
  const v = value.trim()
  if (v === '') return ''
  if (type === 'money' || type === 'number') {
    const n = Number(v.replace(',', '.'))
    if (!Number.isFinite(n)) return v
    const locale = lang === 'en' ? 'en-US' : 'es-CO'
    if (type === 'number') return new Intl.NumberFormat(locale).format(n)
    const cur = /^[A-Z]{3}$/.test(currency) ? currency : 'COP'
    return new Intl.NumberFormat(locale, { style: 'currency', currency: cur }).format(n)
  }
  if (type === 'date') {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v)
    if (!m) return v
    const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
    if (Number.isNaN(d.getTime())) return v
    return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'es-CO', { dateStyle: 'long', timeZone: 'UTC' }).format(d)
  }
  return v
}

/** Las variables sin valor quedan como [[clave]] para que se vean en la vista previa y bloqueen el envío. */
export function fill(
  body: string,
  vars: Record<string, string | undefined>,
  opts: { types?: Record<string, string>; lang?: ContractLang } = {},
): string {
  return body.replace(VAR_RE, (_all, key: string) => {
    const raw = vars[key]
    if (typeof raw !== 'string' || raw.trim() === '') return `[[${key}]]`
    const type = opts.types?.[key]
    return type ? formatValue(raw, type, opts.lang, vars.moneda || 'COP') : raw.trim()
  })
}

export const missingVars = (rendered: string): string[] =>
  [...new Set([...rendered.matchAll(/\[\[([a-z][a-z0-9_]*)\]\]/g)].map((m) => m[1] as string))]

const splitRow = (line: string) => line.replace(/^\||\|$/g, '').split('|').map((c) => c.trim())
const isSeparator = (cells: string[]) => cells.every((c) => /^:?-{3,}:?$/.test(c))

export function toBlocks(text: string): Block[] {
  const blocks: Block[] = []
  let para: string[] = []
  let rows: string[][] = []
  const flush = () => {
    if (para.length > 0) blocks.push({ type: 'p', text: para.join(' ') })
    para = []
  }
  const flushTable = () => {
    if (rows.length === 0) return
    const header = rows.length > 1 && isSeparator(rows[1] as string[])
    blocks.push({ type: 'table', header, rows: rows.filter((r) => !isSeparator(r)) })
    rows = []
  }
  for (const raw of text.replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim()
    if (line.startsWith('|')) {
      flush()
      rows.push(splitRow(line))
      continue
    }
    flushTable()
    if (line === '') flush()
    else if (line.startsWith('#') || line.startsWith('- ')) {
      flush()
      const [type, size] = line.startsWith('## ') ? (['h2', 3] as const) : line.startsWith('# ') ? (['h1', 2] as const) : line.startsWith('- ') ? (['li', 2] as const) : (['p', 0] as const)
      if (type === 'p') para.push(line)
      else blocks.push({ type, text: line.slice(size).trim() })
    } else para.push(line)
  }
  flush()
  flushTable()
  return blocks
}

/** Numera las secciones (1, 2…) y los párrafos dentro de cada sección (1.1, 1.2…); las viñetas y tablas no llevan número. */
export function numbered(blocks: Block[]): Block[] {
  let section = 0
  let clause = 0
  return blocks.map((b) => {
    if (b.type === 'h2') {
      section++
      clause = 0
      return { ...b, num: String(section) }
    }
    if (b.type === 'p' && section > 0) return { ...b, num: `${section}.${++clause}` }
    return b
  })
}

export const documentBlocks = (text: string): Block[] => numbered(toBlocks(text))

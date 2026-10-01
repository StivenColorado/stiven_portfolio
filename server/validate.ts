export type Status = 'published' | 'hidden' | 'archived'
export type Kind = 'demo' | 'oss' | 'case-study'
export const STATUSES: readonly Status[] = ['published', 'hidden', 'archived']
const KINDS: readonly Kind[] = ['demo', 'oss', 'case-study']

export type ProjectInput = {
  slug: string; title: string; summary: string; description: string; kind: Kind
  year: number | null; client: string | null
  links: { demo?: string; repo?: string; gist?: string }
  private: boolean; nda: boolean; featured: boolean
  highlights: string[]; images: string[]; videos: string[]; tags: string[]
  githubRepo: string | null; workingOn: boolean
  i18n: { en?: { title?: string; summary?: string; description?: string; highlights?: string[]; client?: string } }
}
export type ServiceInput = {
  slug: string; title: string; tagline: string; bullets: string[]; icon: string; proof: string[]
  i18n: { en?: { title?: string; tagline?: string; bullets?: string[] } }
}
export type ExperienceInput = {
  date: string; title: string; role: string | null; company: string | null; summary: string | null
  stack: string[]; description: string; link: string | null; contact: string | null
  i18n: { en?: { date?: string; title?: string; role?: string; summary?: string; description?: string } }
}
export type SeedProject = Partial<ProjectInput> & Pick<ProjectInput, 'slug' | 'title' | 'summary' | 'description' | 'kind' | 'i18n'>
export type SeedService = ServiceInput
export type SeedExperience = Partial<ExperienceInput> & Pick<ExperienceInput, 'date' | 'title' | 'description' | 'i18n'>

export type Fields = Record<string, string>
export type Result<T> = { ok: true; value: T } | { ok: false; fields: Fields }

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/
const TAG = /^[A-Z0-9_]{1,24}$/
const ICON = /^[A-Za-z][A-Za-z0-9]{1,31}$/
const GITHUB_REPO = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/

function reader(body: Record<string, unknown>, allowed: string[], prefix = '', fields: Fields = {}) {
  for (const key of Object.keys(body)) if (!allowed.includes(key)) fields[prefix + key] = 'Campo desconocido'
  const fail = (key: string, message: string) => {
    fields[prefix + key] ??= message
  }
  const isUrl = (v: string) => v.length <= 500 && (/^https:\/\/[^\s]+$/.test(v) || /^\/(?!\/)[^\s]*$/.test(v))

  return {
    fields,
    fail,
    text(key: string, max: number, required = true): string {
      const v = body[key]
      if (v === undefined) {
        if (required) fail(key, 'Obligatorio')
        return ''
      }
      if (typeof v !== 'string') return fail(key, 'Debe ser texto'), ''
      const t = v.trim()
      if (required && t === '') fail(key, 'Obligatorio')
      if (t.length > max) fail(key, `Máximo ${max} caracteres`)
      return t
    },
    nullableText(key: string, max: number): string | null {
      const v = body[key]
      if (v === undefined || v === null) return null
      if (typeof v !== 'string') return fail(key, 'Debe ser texto'), null
      const t = v.trim()
      if (t.length > max) fail(key, `Máximo ${max} caracteres`)
      return t === '' ? null : t
    },
    pattern(key: string, re: RegExp, max: number, message: string): string {
      const v = body[key]
      if (typeof v !== 'string' || v.length > max || !re.test(v)) return fail(key, message), ''
      return v
    },
    oneOf<T extends string>(key: string, options: readonly T[]): T {
      const v = body[key]
      if (typeof v !== 'string' || !options.includes(v as T)) return fail(key, `Debe ser: ${options.join(', ')}`), options[0] as T
      return v as T
    },
    bool(key: string): boolean {
      const v = body[key]
      if (v === undefined) return false
      if (typeof v !== 'boolean') return fail(key, 'Debe ser verdadero o falso'), false
      return v
    },
    year(key: string): number | null {
      const v = body[key]
      if (v === undefined || v === null) return null
      if (typeof v !== 'number' || !Number.isInteger(v) || v < 1990 || v > 2100) return fail(key, 'Año entre 1990 y 2100'), null
      return v
    },
    url(key: string, required = false): string | null {
      const v = body[key]
      if (v === undefined || v === null || v === '') {
        if (required) fail(key, 'Obligatorio')
        return null
      }
      if (typeof v !== 'string' || !isUrl(v.trim())) return fail(key, 'Debe ser https:// o una ruta que empiece con /'), null
      return v.trim()
    },
    list(key: string, opts: { max: number; maxLen: number; min?: number; re?: RegExp; reMessage?: string; url?: boolean }): string[] {
      const v = body[key]
      if (v === undefined) {
        if ((opts.min ?? 0) > 0) fail(key, `Mínimo ${opts.min} elemento(s)`)
        return []
      }
      if (!Array.isArray(v)) return fail(key, 'Debe ser una lista'), []
      if (v.length > opts.max) return fail(key, `Máximo ${opts.max} elementos`), []
      if (v.length < (opts.min ?? 0)) return fail(key, `Mínimo ${opts.min} elemento(s)`), []
      const out: string[] = []
      v.forEach((item: unknown, i) => {
        const t = typeof item === 'string' ? item.trim() : null
        if (t === null || t === '') return fail(key, `Elemento ${i + 1}: texto obligatorio`)
        if (t.length > opts.maxLen) return fail(key, `Elemento ${i + 1}: máximo ${opts.maxLen} caracteres`)
        if (opts.re && !opts.re.test(t)) return fail(key, `Elemento ${i + 1}: ${opts.reMessage ?? 'formato inválido'}`)
        if (opts.url && !isUrl(t)) return fail(key, `Elemento ${i + 1}: debe ser https:// o una ruta que empiece con /`)
        out.push(t)
      })
      return out
    },
    links(key: string): ProjectInput['links'] {
      const v = body[key]
      if (v === undefined || v === null) return {}
      if (typeof v !== 'object' || Array.isArray(v)) return fail(key, 'Debe ser un objeto'), {}
      const out: ProjectInput['links'] = {}
      for (const [k, raw] of Object.entries(v)) {
        if (k !== 'demo' && k !== 'repo' && k !== 'gist') {
          fail(key, `Enlace desconocido: ${k}`)
          continue
        }
        if (raw === undefined || raw === null || raw === '') continue
        if (typeof raw !== 'string' || !isUrl(raw.trim())) fail(key, `${k}: debe ser https:// o una ruta que empiece con /`)
        else out[k] = raw.trim()
      }
      return out
    },
  }
}

type EnShape = Record<string, { max: number; kind: 'text' | 'list'; maxLen?: number }>

const EN_PROJECT: EnShape = {
  title: { max: 120, kind: 'text' }, summary: { max: 300, kind: 'text' }, description: { max: 5000, kind: 'text' },
  highlights: { max: 8, maxLen: 300, kind: 'list' }, client: { max: 120, kind: 'text' },
}
const EN_SERVICE: EnShape = {
  title: { max: 120, kind: 'text' }, tagline: { max: 300, kind: 'text' }, bullets: { max: 6, maxLen: 160, kind: 'list' },
}
const EN_EXPERIENCE: EnShape = {
  date: { max: 60, kind: 'text' }, title: { max: 120, kind: 'text' }, role: { max: 120, kind: 'text' },
  summary: { max: 300, kind: 'text' }, description: { max: 5000, kind: 'text' },
}

function i18nOf<T>(body: Record<string, unknown>, shape: EnShape, fields: Fields): { en?: T } {
  const raw = body.i18n
  if (raw === undefined || raw === null) return {}
  if (typeof raw !== 'object' || Array.isArray(raw)) return (fields.i18n ??= 'Debe ser un objeto'), {}
  const top = raw as Record<string, unknown>
  for (const key of Object.keys(top)) if (key !== 'en') fields[`i18n.${key}`] = 'Idioma desconocido'
  const en = top.en
  if (en === undefined || en === null) return {}
  if (typeof en !== 'object' || Array.isArray(en)) return (fields['i18n.en'] ??= 'Debe ser un objeto'), {}
  const r = reader(en as Record<string, unknown>, Object.keys(shape), 'i18n.en.', fields)
  const out: Record<string, unknown> = {}
  for (const [key, spec] of Object.entries(shape)) {
    const value =
      spec.kind === 'text'
        ? r.nullableText(key, spec.max)
        : r.list(key, { max: spec.max, maxLen: spec.maxLen ?? 300 })
    if (value !== null && value.length > 0) out[key] = value
  }
  return Object.keys(out).length > 0 ? ({ en: out } as { en: T }) : {}
}

function done<T>(fields: Fields, value: T): Result<T> {
  return Object.keys(fields).length > 0 ? { ok: false, fields } : { ok: true, value }
}

export function githubRepoOf(body: Record<string, unknown>, fail: (key: string, message: string) => void): string | null {
  const v = body.githubRepo
  if (v === undefined || v === null || v === '') return null
  if (typeof v !== 'string' || v.length > 140 || !GITHUB_REPO.test(v)) return fail('githubRepo', 'Formato owner/nombre (máx. 140)'), null
  return v
}

export function validateProject(body: Record<string, unknown>): Result<ProjectInput> {
  const r = reader(body, ['slug', 'title', 'summary', 'description', 'kind', 'year', 'client', 'links', 'private', 'nda', 'featured', 'highlights', 'images', 'videos', 'tags', 'githubRepo', 'workingOn', 'i18n'])
  const value: ProjectInput = {
    slug: r.pattern('slug', SLUG, 60, 'Solo minúsculas, números y guiones (máx. 60)'),
    title: r.text('title', 120),
    summary: r.text('summary', 300),
    description: r.text('description', 5000, false),
    kind: r.oneOf('kind', KINDS),
    year: r.year('year'),
    client: r.nullableText('client', 120),
    links: r.links('links'),
    private: r.bool('private'),
    nda: r.bool('nda'),
    featured: r.bool('featured'),
    highlights: r.list('highlights', { max: 8, maxLen: 300 }),
    images: r.list('images', { max: 12, maxLen: 500, url: true }),
    videos: r.list('videos', { max: 3, maxLen: 500, url: true }),
    tags: [...new Set(r.list('tags', { max: 20, maxLen: 24, re: TAG, reMessage: 'use la clave del catálogo (ej. REACT)' }))],
    githubRepo: githubRepoOf(body, r.fail),
    workingOn: r.bool('workingOn'),
    i18n: i18nOf(body, EN_PROJECT, r.fields),
  }
  return done(r.fields, value)
}

export function validateService(body: Record<string, unknown>): Result<ServiceInput> {
  const r = reader(body, ['slug', 'title', 'tagline', 'bullets', 'icon', 'proof', 'i18n'])
  const value: ServiceInput = {
    slug: r.pattern('slug', SLUG, 60, 'Solo minúsculas, números y guiones (máx. 60)'),
    title: r.text('title', 120),
    tagline: r.text('tagline', 300),
    bullets: r.list('bullets', { max: 6, min: 1, maxLen: 160 }),
    icon: r.pattern('icon', ICON, 32, 'Solo letras y números (2 a 32)'),
    proof: r.list('proof', { max: 10, maxLen: 60, re: SLUG, reMessage: 'debe ser un slug' }),
    i18n: i18nOf(body, EN_SERVICE, r.fields),
  }
  return done(r.fields, value)
}

export function validateExperience(body: Record<string, unknown>): Result<ExperienceInput> {
  const r = reader(body, ['date', 'title', 'role', 'company', 'summary', 'stack', 'description', 'link', 'contact', 'i18n'])
  const value: ExperienceInput = {
    date: r.text('date', 60),
    title: r.text('title', 120),
    role: r.nullableText('role', 120),
    company: r.nullableText('company', 120),
    summary: r.nullableText('summary', 300),
    stack: r.list('stack', { max: 12, maxLen: 40 }),
    description: r.text('description', 5000),
    link: r.url('link'),
    contact: r.nullableText('contact', 60),
    i18n: i18nOf(body, EN_EXPERIENCE, r.fields),
  }
  return done(r.fields, value)
}

export function validateStatus(body: Record<string, unknown>): Result<Status> {
  const r = reader(body, ['status'])
  const status = r.oneOf('status', STATUSES)
  return done(r.fields, status)
}

export function validateFeatured(body: Record<string, unknown>): Result<boolean> {
  const r = reader(body, ['featured'])
  if (typeof body.featured !== 'boolean') r.fail('featured', 'Debe ser verdadero o falso')
  return done(r.fields, body.featured === true)
}

export function validateReorder(body: Record<string, unknown>): Result<number[]> {
  const r = reader(body, ['ids'])
  const ids = body.ids
  const ok = Array.isArray(ids) && ids.length <= 500 && ids.every((n) => Number.isInteger(n) && n > 0) && new Set(ids).size === ids.length
  if (!ok) r.fail('ids', 'Debe ser una lista de ids únicos')
  return done(r.fields, ok ? (ids as number[]) : [])
}

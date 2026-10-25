import { deflateSync } from 'node:zlib'
import type { Block } from './contract-text.ts'

export type PdfStrokes = { w: number; h: number; strokes: number[][] }
export type PdfSignature = { label: string; name: string; docLine: string; dateLine: string; strokes: PdfStrokes | null }
export type PdfCover = {
  date: string; subtitle: string; clientLabel: string; clientName: string; tagline: string
  owner: { name: string; phone: string; email: string; city: string }; ownerLabels: [string, string, string, string]
}
export type PdfDoc = {
  title: string
  headerLabel: string
  cover: PdfCover
  blocks: Block[]
  ref: string
  hash: string
  pageLabel: string
  watermark?: string
  signaturesHeading: string
  signatures: PdfSignature[]
  evidence?: { heading: string; rows: [string, string][] }
  thanks?: { heading: string; lines: string[] }
}

type Font = 'F1' | 'F2' | 'F3'
type Rgb = [number, number, number]
const PAGE_W = 612
const PAGE_H = 792
const MARGIN = 64
const CONTENT_W = PAGE_W - MARGIN * 2
const BOTTOM = 72
const TOP = PAGE_H - 96
const INK: Rgb = [0.169, 0.165, 0.141]
const ACCENT: Rgb = [0.29, 0.275, 0.212]
const MUTED: Rgb = [0.45, 0.44, 0.4]
const CREAM: Rgb = [0.929, 0.922, 0.867]
const HAIR: Rgb = [0.72, 0.71, 0.66]

const W_SERIF = [
  250, 333, 408, 500, 500, 833, 778, 180, 333, 333, 500, 564, 250, 333, 250, 278, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500,
  278, 278, 564, 564, 564, 444, 921, 722, 667, 667, 722, 611, 556, 722, 722, 333, 389, 722, 611, 889, 722, 722, 556, 722, 667, 556,
  611, 722, 722, 944, 722, 722, 611, 333, 278, 333, 469, 500, 333, 444, 500, 444, 500, 444, 333, 500, 500, 278, 278, 500, 278, 778,
  500, 500, 500, 500, 333, 389, 278, 500, 500, 722, 500, 500, 444, 480, 200, 480, 541,
]
const W_REG = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556,
  278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667,
  611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833,
  556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
]
const W_BOLD = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556,
  333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667,
  611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889,
  611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584,
]

const CP1252: Record<number, number> = {
  0x20ac: 0x80, 0x2026: 0x85, 0x2018: 0x91, 0x2019: 0x92, 0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x2122: 0x99,
}
const ACCENTED = 'ÀÁÂÃÄÅàáâãäå'
const BASE_OF: Record<string, string> = {}
for (const [chars, base] of [
  [ACCENTED.slice(0, 6), 'A'], [ACCENTED.slice(6), 'a'], ['ÈÉÊË', 'E'], ['èéêë', 'e'], ['ÌÍÎÏ', 'I'], ['ìíîï', 'i'],
  ['ÒÓÔÕÖ', 'O'], ['òóôõö', 'o'], ['ÙÚÛÜ', 'U'], ['ùúûü', 'u'], ['Ñ', 'N'], ['ñ', 'n'], ['Ç', 'C'], ['ç', 'c'], ['Ýý', 'y'],
] as const) for (const c of chars) BASE_OF[c] = base
const EXTRA: Record<string, [number, number]> = {
  '¡': [333, 333], '¿': [611, 611], 'º': [365, 365], 'ª': [370, 370], '«': [556, 556], '»': [556, 556], '©': [737, 737],
  '®': [737, 737], '°': [400, 400], '±': [584, 584], '×': [584, 584], '·': [278, 278], '½': [834, 834], '•': [350, 350],
  '–': [556, 556], '—': [1000, 1000], '…': [1000, 1000], '‘': [222, 278], '’': [222, 278], '“': [333, 500], '”': [333, 500],
  '€': [556, 556], '™': [1000, 1000],
}


const TABLE_OF: Record<Font, number[]> = { F1: W_REG, F2: W_BOLD, F3: W_SERIF }

function charWidth(ch: string, font: Font): number {
  const code = ch.charCodeAt(0)
  if (code >= 32 && code <= 126) return TABLE_OF[font][code - 32] as number
  const extra = EXTRA[ch]
  if (extra) return extra[font === 'F2' ? 1 : 0]
  const base = BASE_OF[ch]
  if (base) return charWidth(base, font)
  return font === 'F3' ? 500 : 556
}

const textWidth = (text: string, font: Font, size: number, tc = 0) => {
  let w = 0
  for (const ch of text) w += charWidth(ch, font)
  return (w * size) / 1000 + tc * [...text].length
}

function winAnsiHex(text: string): string {
  let out = ''
  for (const ch of text) {
    const cp = ch.codePointAt(0) as number
    let byte = CP1252[cp] ?? (cp < 0x100 && !(cp >= 0x80 && cp < 0xa0) ? cp : 0x3f)
    if (cp < 32) byte = 0x20
    out += byte.toString(16).padStart(2, '0')
  }
  return `<${out}>`
}

const utf16Hex = (text: string) => `<FEFF${Buffer.from(text, 'utf16le').swap16().toString('hex')}>`
const num = (n: number) => (Math.round(n * 100) / 100).toString()
const rgb = (c: Rgb) => c.map(num).join(' ')

function wrap(text: string, font: Font, size: number, maxW: number): string[] {
  const lines: string[] = []
  let line = ''
  const limit = maxW * 0.985
  for (const word of text.split(/\s+/).filter(Boolean)) {
    let rest = word
    while (textWidth(rest, font, size) > limit) {
      let cut = rest.length
      while (cut > 1 && textWidth(rest.slice(0, cut), font, size) > limit) cut--
      if (line) {
        lines.push(line)
        line = ''
      }
      lines.push(rest.slice(0, cut))
      rest = rest.slice(cut)
    }
    const candidate = line ? `${line} ${rest}` : rest
    if (textWidth(candidate, font, size) <= limit) line = candidate
    else {
      lines.push(line)
      line = rest
    }
  }
  if (line) lines.push(line)
  return lines
}

type PageKind = 'cover' | 'body' | 'thanks'
type Style = { font?: Font; size?: number; color?: Rgb; tc?: number; align?: 'left' | 'center' | 'right' }

class Layout {
  pages: { kind: PageKind; ops: string[] }[] = []
  y = 0
  private cur!: { kind: PageKind; ops: string[] }

  newPage(kind: PageKind = 'body'): void {
    this.cur = { kind, ops: [] }
    this.pages.push(this.cur)
    this.y = kind === 'body' ? TOP : PAGE_H - MARGIN
  }

  ensure(h: number): void {
    if (this.y - h < BOTTOM) this.newPage()
  }

  /** x es el borde izquierdo, el centro o el borde derecho según align. */
  text(str: string, x: number, y: number, st: Style = {}): void {
    const font = st.font ?? 'F1'
    const size = st.size ?? 10
    const tc = st.tc ?? 0
    const w = textWidth(str, font, size, tc)
    const px = st.align === 'center' ? x - w / 2 : st.align === 'right' ? x - w : x
    this.cur.ops.push(`q ${rgb(st.color ?? INK)} rg BT /${font} ${size} Tf ${tc ? `${num(tc)} Tc ` : ''}${num(px)} ${num(y)} Td ${winAnsiHex(str)} Tj ET Q`)
  }

  line(x1: number, x2: number, y: number, width = 0.5, color: Rgb = HAIR): void {
    this.cur.ops.push(`q ${rgb(color)} RG ${width} w ${num(x1)} ${num(y)} m ${num(x2)} ${num(y)} l S Q`)
  }

  raw(op: string): void {
    this.cur.ops.push(op)
  }

  lines(text: string, o: { x: number; width: number; font?: Font; size: number; leading: number; color?: Rgb; align?: 'left' | 'center' }): void {
    for (const line of wrap(text, o.font ?? 'F1', o.size, o.width)) {
      this.ensure(o.leading)
      this.y -= o.leading
      this.text(line, o.align === 'center' ? o.x + o.width / 2 : o.x, this.y, { font: o.font, size: o.size, color: o.color, align: o.align })
    }
  }
}

const upper = (s: string) => s.toLocaleUpperCase('es')

function drawCover(l: Layout, c: PdfCover, title: string): void {
  l.newPage('cover')
  l.text(upper(c.date), PAGE_W - MARGIN, PAGE_H - 70, { size: 7.5, tc: 1.6, color: ACCENT, align: 'right' })
  l.y = 560
  l.lines(title, { x: MARGIN + 30, width: CONTENT_W - 60, font: 'F3', size: 34, leading: 40, align: 'center' })
  l.y -= 34
  l.text(upper(c.subtitle), PAGE_W / 2, l.y, { size: 8.5, tc: 3, color: ACCENT, align: 'center' })
  l.y -= 34
  l.line(PAGE_W / 2 - 40, PAGE_W / 2 + 40, l.y, 0.8, ACCENT)
  l.y -= 30
  l.text(`${c.clientLabel}: ${c.clientName}`, PAGE_W / 2, l.y, { font: 'F3', size: 14, align: 'center' })
  l.y -= 10
  l.lines(c.tagline, { x: PAGE_W / 2 - 160, width: 320, size: 9, leading: 14, color: MUTED, align: 'center' })

  const rows = [c.owner.name, c.owner.phone, c.owner.email, c.owner.city].map((v, i) => [c.ownerLabels[i] as string, v] as const).filter(([, v]) => v)
  let y = 150 + rows.length * 22
  const width = 230
  l.line(MARGIN, MARGIN + width, y, 0.8, ACCENT)
  for (const [label, value] of rows) {
    l.text(upper(label), MARGIN, y - 14, { size: 6.5, tc: 1.4, color: MUTED })
    l.text(value, MARGIN + 70, y - 14, { size: 9 })
    y -= 22
    l.line(MARGIN, MARGIN + width, y, 0.4)
  }
}

function drawThanks(l: Layout, t: NonNullable<PdfDoc['thanks']>): void {
  l.newPage('thanks')
  l.text(t.heading, PAGE_W / 2, 470, { font: 'F3', size: 48, align: 'center' })
  l.line(PAGE_W / 2 - 40, PAGE_W / 2 + 40, 440, 0.8, ACCENT)
  let y = 410
  for (const line of t.lines) {
    l.text(line, PAGE_W / 2, y, { size: 10, color: ACCENT, align: 'center' })
    y -= 18
  }
}

function drawTable(l: Layout, rows: string[][], o: { header: boolean; widths?: number[]; alignLast?: boolean }): void {
  const cols = Math.max(...rows.map((r) => r.length))
  const grid = rows.map((r) => Array.from({ length: cols }, (_, i) => r[i] ?? ''))
  const padX = 6
  const padY = 6
  const size = 9
  const leading = 12.5
  const natural = Array.from({ length: cols }, (_, i) => Math.min(260, Math.max(40, ...grid.map((r, idx) => (o.header && idx === 0 ? textWidth(upper(r[i] as string), 'F2', 7.5, 0.8) + 4 : textWidth(r[i] as string, 'F1', size)) + padX * 2))))
  const total = natural.reduce((a, b) => a + b, 0)
  const widths = o.widths ?? natural.map((n) => (n * CONTENT_W) / total)
  const alignLast = o.alignLast ?? cols > 1
  l.y -= 4
  grid.forEach((row, idx) => {
    const head = o.header && idx === 0
    const bold = head || /^total/i.test(row[0] as string)
    const font: Font = bold ? 'F2' : 'F1'
    const sz = head ? 7.5 : size
    const cells = row.map((cell, i) => wrap(head ? upper(cell) : cell, font, sz, (widths[i] as number) - padX * 2 - (head ? 4 : 0)))
    const h = Math.max(...cells.map((c) => c.length), 1) * leading + padY * 2
    l.ensure(h)
    const top = l.y
    if (idx === 0) l.line(MARGIN, MARGIN + CONTENT_W, top, 0.9, ACCENT)
    let x = MARGIN
    cells.forEach((lines, i) => {
      const right = alignLast && i === cols - 1
      lines.forEach((line, k) => {
        const base = top - padY - sz * 0.9 - k * leading
        l.text(line, right ? x + (widths[i] as number) - padX : x + padX, base, { font, size: sz, color: head ? ACCENT : INK, tc: head ? 0.8 : 0, align: right ? 'right' : 'left' })
      })
      x += widths[i] as number
    })
    l.y = top - h
    l.line(MARGIN, MARGIN + CONTENT_W, l.y, head || idx === grid.length - 1 ? 0.9 : 0.4, head || idx === grid.length - 1 ? ACCENT : HAIR)
  })
  l.y -= 12
}

function drawSignature(l: Layout, sig: PdfSignature, x: number, top: number, width: number): void {
  const area = 64
  const base = top - area
  l.text(upper(sig.label), x, top + 8, { size: 7, tc: 1.4, color: ACCENT })
  l.line(x, x + width, base, 0.8, INK)
  if (sig.strokes) {
    const { w, h, strokes } = sig.strokes
    const k = Math.min((width - 8) / w, (area - 6) / h)
    const ox = x + (width - w * k) / 2
    const oy = base + 3
    const paths: string[] = []
    for (const s of strokes) {
      if (s.length < 2) continue
      const pts: string[] = []
      for (let i = 0; i + 1 < s.length; i += 2) pts.push(`${num(ox + (s[i] as number) * k)} ${num(oy + (h - (s[i + 1] as number)) * k)}`)
      const [first, ...tail] = pts as [string, ...string[]]
      paths.push(`${first} m ${(tail.length > 0 ? tail : [first]).map((p) => `${p} l`).join(' ')} S`)
    }
    l.raw(`q 0.08 0.08 0.1 RG 1.3 w 1 J 1 j ${paths.join(' ')} Q`)
  }
  l.text(sig.name, x, base - 14, { font: 'F2', size: 9.5 })
  l.text(sig.docLine, x, base - 26, { size: 8, color: MUTED })
  l.text(sig.dateLine, x, base - 37, { size: 8, color: MUTED })
}

function drawBlocks(l: Layout, blocks: Block[]): void {
  const numW = 30
  for (const b of blocks) {
    if (b.type === 'table') {
      drawTable(l, b.rows, { header: b.header })
    } else if (b.type === 'h1') {
      l.lines(b.text, { x: MARGIN, width: CONTENT_W, font: 'F3', size: 19, leading: 24, align: 'center' })
      l.y -= 14
      l.line(MARGIN + CONTENT_W / 2 - 30, MARGIN + CONTENT_W / 2 + 30, l.y, 0.8, ACCENT)
      l.y -= 16
    } else if (b.type === 'h2') {
      l.ensure(70)
      l.y -= 12
      const label = upper(b.text)
      l.y -= 12
      if (b.num) l.text(`${b.num}.`, MARGIN, l.y, { font: 'F2', size: 9.5, tc: 1.2, color: ACCENT })
      for (const [i, line] of wrap(label, 'F2', 9.5, CONTENT_W - numW).entries()) {
        if (i > 0) {
          l.ensure(14)
          l.y -= 13
        }
        l.text(line, MARGIN + numW, l.y, { font: 'F2', size: 9.5, tc: 1.2, color: ACCENT })
      }
      l.line(MARGIN, MARGIN + CONTENT_W, l.y - 5, 0.4)
      l.y -= 9
    } else if (b.type === 'li') {
      const top = l.y
      l.lines(b.text, { x: MARGIN + numW + 14, width: CONTENT_W - numW - 14, size: 10, leading: 14.5 })
      l.text('–', MARGIN + numW + 2, top - 14.5, { color: ACCENT })
      l.y -= 3
    } else {
      l.ensure(30)
      const top = l.y
      l.lines(b.text, { x: MARGIN + (b.num ? numW : 0), width: CONTENT_W - (b.num ? numW : 0), size: 10, leading: 14.5 })
      if (b.num) l.text(b.num, MARGIN, top - 14.5, { font: 'F2', size: 8.5, color: ACCENT })
      l.y -= 6
    }
  }
}

function finishPages(doc: PdfDoc, l: Layout): string[] {
  const total = l.pages.length
  const mark = doc.watermark
  return l.pages.map((p, i) => {
    const out: string[] = []
    if (p.kind !== 'body') out.push(`${rgb(CREAM)} rg 0 0 ${PAGE_W} ${PAGE_H} re f`)
    if (mark) {
      const w0 = textWidth(mark, 'F2', 90)
      const size = Math.min(90, (90 * 620) / w0)
      const w = textWidth(mark, 'F2', size)
      out.push(`q ${p.kind === 'body' ? '0.93 g' : '0.89 0.88 0.83 rg'} 0.7071 0.7071 -0.7071 0.7071 ${PAGE_W / 2} ${PAGE_H / 2} cm BT /F2 ${num(size)} Tf ${num(-w / 2)} -30 Td ${winAnsiHex(mark)} Tj ET Q`)
    }
    out.push(...p.ops)
    if (p.kind === 'body') {
      out.push(`q ${rgb(INK)} rg BT /F3 13 Tf ${MARGIN} ${PAGE_H - 52} Td ${winAnsiHex(doc.headerLabel)} Tj ET Q`)
      out.push(`q ${rgb(MUTED)} rg BT /F1 6.5 Tf 1.4 Tc ${MARGIN} ${PAGE_H - 63} Td ${winAnsiHex(upper(doc.cover.subtitle))} Tj ET Q`)
      out.push(`q ${rgb(HAIR)} RG 0.5 w ${MARGIN} ${PAGE_H - 70} m ${PAGE_W - MARGIN} ${PAGE_H - 70} l S ${MARGIN} 54 m ${PAGE_W - MARGIN} 54 l S Q`)
      const page = doc.pageLabel.replace('{page}', String(i + 1)).replace('{pages}', String(total))
      const pw = textWidth(page, 'F1', 7)
      out.push(`q ${rgb(MUTED)} rg BT /F1 7 Tf ${MARGIN} 40 Td ${winAnsiHex(`${doc.ref} · SHA-256 ${doc.hash.slice(0, 12)}`)} Tj ET BT /F1 7 Tf ${num(PAGE_W - MARGIN - pw)} 40 Td ${winAnsiHex(page)} Tj ET Q`)
    }
    return out.join('\n')
  })
}

export function buildPdf(doc: PdfDoc): Buffer {
  const l = new Layout()
  drawCover(l, doc.cover, doc.title)
  l.newPage()
  drawBlocks(l, doc.blocks)

  if (doc.signatures.length > 0) {
    l.ensure(190)
    l.y -= 20
    l.text(upper(doc.signaturesHeading), MARGIN, l.y, { font: 'F2', size: 9.5, tc: 1.2, color: ACCENT })
    l.line(MARGIN, MARGIN + CONTENT_W, l.y - 5, 0.4)
    const width = 210
    const top = l.y - 62
    doc.signatures.slice(0, 2).forEach((sig, i) => drawSignature(l, sig, MARGIN + i * (CONTENT_W - width), top, width))
    l.y = top - 64 - 40
  }

  if (doc.evidence) {
    l.newPage()
    l.lines(doc.evidence.heading, { x: MARGIN, width: CONTENT_W, font: 'F3', size: 18, leading: 22 })
    l.y -= 6
    drawTable(l, doc.evidence.rows.map(([a, b]) => [a, b]), { header: false, widths: [150, CONTENT_W - 150], alignLast: false })
  }
  if (doc.thanks) drawThanks(l, doc.thanks)

  const streams = finishPages(doc, l).map((s) => deflateSync(Buffer.from(s, 'latin1')))
  const objs: Buffer[] = []
  const add = (s: string | Buffer) => objs.push(Buffer.isBuffer(s) ? s : Buffer.from(s, 'latin1'))
  const kids = streams.map((_, i) => `${6 + i * 2} 0 R`).join(' ')
  add('<< /Type /Catalog /Pages 2 0 R >>')
  add(`<< /Type /Pages /Kids [${kids}] /Count ${streams.length} >>`)
  add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')
  add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>')
  add('<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman /Encoding /WinAnsiEncoding >>')
  streams.forEach((s, i) => {
    add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents ${7 + i * 2} 0 R >>`)
    add(Buffer.concat([Buffer.from(`<< /Length ${s.length} /Filter /FlateDecode >>\nstream\n`, 'latin1'), s, Buffer.from('\nendstream', 'latin1')]))
  })
  const infoId = objs.length + 1
  add(`<< /Title ${utf16Hex(doc.title)} /Producer ${utf16Hex('Portafolio · Contratos')} >>`)

  const parts: Buffer[] = [Buffer.from('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', 'latin1')]
  const offsets: number[] = []
  let pos = parts[0]!.length
  objs.forEach((o, i) => {
    offsets.push(pos)
    const chunk = Buffer.concat([Buffer.from(`${i + 1} 0 obj\n`, 'latin1'), o, Buffer.from('\nendobj\n', 'latin1')])
    parts.push(chunk)
    pos += chunk.length
  })
  const xref = ['xref', `0 ${objs.length + 1}`, '0000000000 65535 f ', ...offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n `)]
  parts.push(Buffer.from(`${xref.join('\n')}\ntrailer\n<< /Size ${objs.length + 1} /Root 1 0 R /Info ${infoId} 0 R >>\nstartxref\n${pos}\n%%EOF\n`, 'latin1'))
  return Buffer.concat(parts)
}

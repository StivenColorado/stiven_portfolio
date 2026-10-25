import PDFDocument from 'pdfkit'
import { pendingText } from './contract-text.ts'
import type { Block } from './contract-text.ts'

export type PdfStrokes = { w: number; h: number; strokes: number[][] }
export type PdfSignature = { label: string; name: string; docLine: string; dateLine: string; strokes: PdfStrokes | null }
export type PdfCover = {
  date: string; subtitle: string; clientLabel: string; clientName: string; tagline: string
  owner: { name: string; phone: string; email: string; city: string }; ownerLabels: [string, string, string, string]
  labels?: { preparedFor: string; by: string }
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

const FONT_DIR = new URL('./assets/fonts/', import.meta.url)
const FONTS = {
  serifM: 'cormorant-garamond-latin-500-normal.woff',
  serif: 'cormorant-garamond-latin-600-normal.woff',
  serifB: 'cormorant-garamond-latin-700-normal.woff',
  serifI: 'cormorant-garamond-latin-600-italic.woff',
  sans: 'nunito-latin-400-normal.woff',
  sansI: 'nunito-latin-400-italic.woff',
  sansS: 'nunito-latin-600-normal.woff',
  sansB: 'nunito-latin-700-normal.woff',
} as const
type FontKey = keyof typeof FONTS

const W = 612
const H = 792
const M = 64
const CW = W - M * 2
const TOP = 96
const BOTTOM = H - 84
const CREAM = '#F4F1E8'
const INK = '#1F1D18'
const ACCENT = '#4A4636'
const LINE = '#CFC9B8'
const MUTED = '#6B6657'
const WARN_BG = '#EADFC0'
const WARN_FG = '#8A5A1E'

const BODY = 9.8
const BODY_LH = BODY * 1.55
const PLACEHOLDER = /(\[\[[a-z][a-z0-9_]*\]\])/

type Token = { t: string; hl: boolean; x: number }
type Style = { font: FontKey; size: number; cs?: number }

const clean = (s: string) => [...s].filter((c) => c.charCodeAt(0) >= 32 && c.charCodeAt(0) !== 127).join('').replaceAll('\u00a0', ' ')

/** Dibuja con pdfkit llevando el cursor vertical a mano: así controlamos viudas, huérfanas y bloques que no se parten. */
export function buildPdf(d: PdfDoc): Promise<Buffer> {
  const doc = new PDFDocument({
    size: 'LETTER', margins: { top: 0, bottom: 0, left: 0, right: 0 }, bufferPages: true, autoFirstPage: false, compress: true,
    info: { Title: d.title, Author: d.cover.owner.name, Subject: d.cover.subtitle, Creator: 'stiven_portfolio' },
  })
  const chunks: Buffer[] = []
  doc.on('data', (c: Buffer) => chunks.push(c))
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
  })
  for (const [key, file] of Object.entries(FONTS)) doc.registerFont(key, new URL(file, FONT_DIR).pathname)

  const interior: number[] = []
  let y = TOP

  const width = (t: string, s: Style) => doc.font(s.font).fontSize(s.size).widthOfString(t, { characterSpacing: s.cs ?? 0 })
  const put = (t: string, x: number, yy: number, s: Style, color = INK) => {
    doc.font(s.font).fontSize(s.size).fillColor(color).text(t, x, yy + 0.5, { lineBreak: false, characterSpacing: s.cs ?? 0 })
  }
  const hline = (x1: number, x2: number, yy: number, color = LINE, w = 0.5) => {
    doc.save().lineWidth(w).strokeColor(color).moveTo(x1, yy).lineTo(x2, yy).stroke().restore()
  }

  function watermark() {
    if (!d.watermark) return
    doc.save().rotate(-35, { origin: [W / 2, H / 2] }).fillOpacity(0.055).fillColor(INK).font('serifB').fontSize(d.watermark.length > 10 ? 64 : 110)
    const w = doc.widthOfString(d.watermark)
    doc.text(d.watermark, (W - w) / 2, H / 2 - 40, { lineBreak: false }).restore()
  }

  function frame(cream: boolean) {
    if (cream) doc.rect(0, 0, W, H).fill(CREAM)
    doc.save().lineWidth(0.6).strokeOpacity(0.55).strokeColor(ACCENT).rect(28, 28, W - 56, H - 56).stroke().restore()
  }

  function newPage() {
    doc.addPage()
    interior.push(doc.bufferedPageRange().count - 1)
    watermark()
    y = TOP
  }

  const ensure = (h: number) => {
    if (y + h > BOTTOM) newPage()
  }

  function wrap(text: string, maxW: number, s: Style): Token[][] {
    const hlStyle: Style = s.font === 'sans' ? { ...s, font: 'sansS' } : s
    const sp = width('x x', s) - width('xx', s)
    const toks: { t: string; hl: boolean; sp: boolean }[] = []
    let prev = ''
    for (const piece of clean(text).split(PLACEHOLDER)) {
      if (piece === '') continue
      const spaced = /\s$/.test(prev)
      prev = piece
      if (PLACEHOLDER.test(piece)) toks.push({ t: pendingText(piece.slice(2, -2)), hl: true, sp: spaced })
      else for (const m of piece.matchAll(/\S+/g)) toks.push({ t: m[0], hl: false, sp: m.index > 0 ? /\s/.test(piece[m.index - 1] as string) : /^\s/.test(piece) })
    }
    const lines: Token[][] = [[]]
    let x = 0
    for (const tk of toks) {
      const st = tk.hl ? hlStyle : s
      let parts = [tk.t]
      if (width(tk.t, st) > maxW) {
        parts = []
        let cur = ''
        for (const ch of tk.t) {
          if (cur !== '' && width(cur + ch, st) > maxW) {
            parts.push(cur)
            cur = ch
          } else cur += ch
        }
        if (cur) parts.push(cur)
      }
      parts.forEach((p, i) => {
        const tw = width(p, st)
        let line = lines[lines.length - 1] as Token[]
        const gap = line.length > 0 && tk.sp && i === 0 ? sp : 0
        if (line.length > 0 && (x + gap + tw > maxW || i > 0)) {
          line = []
          lines.push(line)
          x = 0
        } else x += gap
        line.push({ t: p, hl: tk.hl, x })
        x += tw
      })
    }
    return lines.filter((l) => l.length > 0)
  }

  function drawLine(line: Token[], x: number, yy: number, lh: number, s: Style, color = INK, align: 'left' | 'right' = 'left', boxW = 0) {
    const hlStyle: Style = s.font === 'sans' ? { ...s, font: 'sansS' } : s
    const last = line[line.length - 1] as Token
    const total = last.x + width(last.t, last.hl ? hlStyle : s)
    const shift = align === 'right' ? boxW - total : 0
    const top = yy + (lh - s.size * 1.3) / 2
    for (const tk of line) {
      const st = tk.hl ? hlStyle : s
      const tx = x + shift + tk.x
      if (tk.hl) {
        const tw = width(tk.t, st)
        doc.save().roundedRect(tx - 1.5, top - 0.5, tw + 3, s.size * 1.3 + 1, 2).fill(WARN_BG).restore()
      }
      put(tk.t, tx, top, st, tk.hl ? WARN_FG : color)
    }
  }

  /** Párrafo con sangría colgante; evita dejar una sola línea sola arriba o abajo de una página. */
  function flow(text: string, x: number, maxW: number, s: Style, lh: number, color = INK, lead?: (yy: number) => void) {
    const lines = wrap(text, maxW, s)
    let i = 0
    let first = true
    while (i < lines.length) {
      const left = lines.length - i
      let fit = Math.floor((BOTTOM - y) / lh)
      if (fit < left) {
        if (left - fit < 2) fit = left - 2
        if (fit < 2) {
          newPage()
          continue
        }
      }
      const n = Math.min(fit, left)
      for (let k = 0; k < n; k++) {
        if (first && k === 0) lead?.(y)
        drawLine(lines[i + k] as Token[], x, y + k * lh, lh, s, color)
      }
      y += n * lh
      i += n
      first = false
      if (i < lines.length) newPage()
    }
  }

  function diamond(cx: number, cy: number, r: number, color = ACCENT) {
    doc.save().fillColor(color).moveTo(cx, cy - r).lineTo(cx + r, cy).lineTo(cx, cy + r).lineTo(cx - r, cy).closePath().fill().restore()
  }

  function heading(text: string, num?: string) {
    const s: Style = { font: 'serif', size: 15.5, cs: 0.9 }
    const lines = wrap(text.toUpperCase(), CW - 30, s)
    const lh = 20
    ensure(26 + lines.length * lh + 10 + BODY_LH * 2)
    if (y > TOP + 4) y += 14
    const x = num ? M + 30 : M
    if (num) put(num, M, y + 4, { font: 'sansB', size: 11 }, ACCENT)
    lines.forEach((l, i) => drawLine(l, x, y + i * lh, lh, s))
    y += lines.length * lh + 5
    hline(M, M + CW, y)
    y += 12
  }

  function table(rows: string[][], header: boolean) {
    const n = Math.max(...rows.map((r) => r.length))
    const body: Style = { font: 'sans', size: 8.8 }
    const head: Style = { font: 'sansB', size: 6.8, cs: 1 }
    const cell = (r: string[], c: number) => clean(r[c] ?? '')
    const GAP = 16
    const avail = CW - GAP * (n - 1)
    const nat: number[] = []
    const min: number[] = []
    for (let c = 0; c < n; c++) {
      let a = 0
      let b = 0
      rows.forEach((r, ri) => {
        const st = header && ri === 0 ? head : body
        const t = header && ri === 0 ? cell(r, c).toUpperCase() : cell(r, c)
        a = Math.max(a, width(t, st))
        for (const w of t.split(/\s+/)) b = Math.max(b, width(w, st))
      })
      nat.push(a + 1)
      min.push(Math.min(b + 1, avail / n))
    }
    const sumNat = nat.reduce((p, q) => p + q, 0)
    const sumMin = min.reduce((p, q) => p + q, 0)
    const cw = nat.map((v, i) => {
      if (sumNat <= avail) return v + ((avail - sumNat) * v) / sumNat
      const room = sumNat - sumMin
      return (min[i] as number) + (room > 0 ? ((avail - sumMin) * (v - (min[i] as number))) / room : 0)
    })
    const xs: number[] = []
    let acc = M
    for (const w of cw) {
      xs.push(acc)
      acc += w + GAP
    }
    const lh = 12.6
    const PAD = 6.5
    const layout = (r: string[], st: Style, upper: boolean) =>
      Array.from({ length: n }, (_, c) => wrap(upper ? cell(r, c).toUpperCase() : cell(r, c), cw[c] as number, st))
    const headRows = header ? layout(rows[0] as string[], head, true) : null
    const headH = headRows ? Math.max(...headRows.map((l) => l.length)) * 10 + 11 : 0

    const drawHead = () => {
      if (!headRows) return
      headRows.forEach((ls, c) => ls.forEach((l, i) => drawLine(l, xs[c] as number, y + 3 + i * 10, 10, head, MUTED, c === n - 1 && n > 1 ? 'right' : 'left', cw[c] as number)))
      y += headH
      hline(M, M + CW, y, INK, 1)
    }
    ensure(headH + 40)
    drawHead()
    const data = header ? rows.slice(1) : rows
    data.forEach((r, ri) => {
      const total = /^(total|subtotal)\b/i.test(cell(r, 0))
      const st: Style = total ? { font: 'sansB', size: 8.8 } : body
      const ls = layout(r, st, false)
      const h = Math.max(...ls.map((l) => l.length), 1) * lh + PAD * 2
      if (y + h > BOTTOM) {
        newPage()
        drawHead()
      }
      if (total) hline(M, M + CW, y, INK, 1)
      ls.forEach((l, c) => l.forEach((ln, i) => drawLine(ln, xs[c] as number, y + PAD + i * lh, lh, st, INK, c === n - 1 && n > 1 ? 'right' : 'left', cw[c] as number)))
      y += h
      if (!total && ri < data.length - 1) hline(M, M + CW, y)
    })
    hline(M, M + CW, y, LINE, 0.5)
    y += 14
  }

  function block(b: Block) {
    if (b.type === 'h2') return heading(b.text, b.num)
    if (b.type === 'table') return table(b.rows, b.header)
    if (b.type === 'h1') {
      const s: Style = { font: 'serifB', size: 22, cs: 0.4 }
      const lines = wrap(b.text, CW, s)
      ensure(lines.length * 27 + 30)
      lines.forEach((l, i) => drawLine(l, M, y + i * 27, 27, s))
      y += lines.length * 27 + 12
      return
    }
    const s: Style = { font: 'sans', size: BODY }
    if (b.type === 'li') {
      flow(b.text, M + 20, CW - 20, s, BODY_LH, INK, (yy) => diamond(M + 8, yy + BODY_LH / 2, 2))
      y += 4.5
      return
    }
    if (b.num) {
      flow(b.text, M + 30, CW - 30, s, BODY_LH, INK, (yy) => put(b.num as string, M, yy + (BODY_LH - BODY * 1.3) / 2, { font: 'sansB', size: BODY - 0.6 }, ACCENT))
    } else flow(b.text, M, CW, s, BODY_LH)
    y += 7
  }

  function strokesIn(sig: PdfStrokes, x: number, top: number, bw: number, bh: number) {
    const k = Math.min(bw / sig.w, bh / sig.h)
    const ox = x + (bw - sig.w * k) / 2
    const oy = top + (bh - sig.h * k)
    doc.save().lineWidth(1.4).lineCap('round').lineJoin('round').strokeColor(INK).fillColor(INK)
    for (const s of sig.strokes) {
      const pts: [number, number][] = []
      for (let i = 0; i + 1 < s.length; i += 2) pts.push([ox + (s[i] as number) * k, oy + (s[i + 1] as number) * k])
      if (pts.length === 0) continue
      if (pts.length === 1 || (pts.length === 2 && pts[0]![0] === pts[1]![0] && pts[0]![1] === pts[1]![1])) {
        doc.circle(pts[0]![0], pts[0]![1], 0.8).fill()
        continue
      }
      doc.moveTo(pts[0]![0], pts[0]![1])
      for (let i = 1; i < pts.length - 1; i++) {
        const p = pts[i] as [number, number]
        const q = pts[i + 1] as [number, number]
        doc.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2)
      }
      const last = pts[pts.length - 1] as [number, number]
      doc.lineTo(last[0], last[1]).stroke()
    }
    doc.restore()
  }

  function signatures() {
    if (d.signatures.length === 0) return
    const boxH = 84
    ensure(60 + boxH + 70)
    heading(d.signaturesHeading)
    y += 8
    const gap = 36
    const colW = (CW - gap) / 2
    const label: Style = { font: 'sansB', size: 6.8, cs: 1.6 }
    d.signatures.slice(0, 2).forEach((sg, i) => {
      const x = M + i * (colW + gap)
      put(sg.label.toUpperCase(), x, y, label, ACCENT)
      if (sg.strokes) strokesIn(sg.strokes, x, y + 16, colW, boxH)
      const ly = y + 16 + boxH + 4
      hline(x, x + colW, ly, INK, 0.7)
      let ty = ly + 8
      for (const [t, s, c] of [[sg.name, { font: 'sansB', size: 10 }, INK], [sg.docLine, { font: 'sans', size: 8.6 }, MUTED], [sg.dateLine, { font: 'sans', size: 8.6 }, MUTED]] as [string, Style, string][]) {
        if (!t) continue
        const ls = wrap(t, colW, s)
        ls.forEach((l, k) => drawLine(l, x, ty + k * 13, 13, s, c))
        ty += ls.length * 13
      }
    })
    y += 16 + boxH + 4 + 8 + 13 * 3 + 10
  }

  function evidence(ev: { heading: string; rows: [string, string][] }) {
    newPage()
    heading(ev.heading)
    const labelW = 128
    const lab: Style = { font: 'sansB', size: 6.8, cs: 1 }
    ev.rows.forEach(([k, v]) => {
      const mono = /^[0-9a-f]{64}$/i.test(v)
      const st: Style = mono ? { font: 'sansS', size: 8.2, cs: 0.7 } : { font: 'sans', size: 8.8 }
      const ls = wrap(v, CW - labelW - 12, st)
      const lh = 12.6
      const h = ls.length * lh + 13
      if (y + h > BOTTOM) newPage()
      const kl = wrap(k.toUpperCase(), labelW - 8, lab)
      kl.forEach((l, i) => drawLine(l, M, y + 6.5 + i * 10, 10, lab, MUTED))
      ls.forEach((l, i) => drawLine(l, M + labelW + 12, y + 6.5 + i * lh, lh, st))
      y += Math.max(h, kl.length * 10 + 13)
      hline(M, M + CW, y)
    })
  }

  function ornament(cx: number, yy: number, half = 64) {
    hline(cx - half, cx - 9, yy, ACCENT, 0.6)
    hline(cx + 9, cx + half, yy, ACCENT, 0.6)
    diamond(cx, yy, 3.4)
  }

  const centered = (t: string, yy: number, s: Style, color = INK) => put(t, (W - width(t, s) + (s.cs ?? 0)) / 2, yy, s, color)

  function cover() {
    const c = d.cover
    doc.addPage()
    frame(true)
    watermark()
    const dateS: Style = { font: 'sansS', size: 7.2, cs: 1.6 }
    const date = c.date.toUpperCase()
    put(date, W - 52 - width(date, dateS) + 1.6, 54, dateS, MUTED)

    let size = 46
    while (size > 20 && wrap(d.title, 440, { font: 'serif', size }).length > 3) size -= 2
    const lines = wrap(d.title, 440, { font: 'serif', size })
    const lh = size * 1.06
    let ty = 235 - ((lines.length - 1) * lh) / 2
    const ts: Style = { font: 'serif', size }
    for (const l of lines) {
      const last = l[l.length - 1] as Token
      const w = last.x + width(last.t, ts)
      drawLine(l, (W - w) / 2, ty, lh, ts)
      ty += lh
    }
    ty += 22
    ornament(W / 2, ty)
    ty += 26
    centered(c.subtitle.toUpperCase(), ty, { font: 'sansS', size: 8, cs: 3 }, ACCENT)

    const lab: Style = { font: 'sansB', size: 6.6, cs: 2 }
    const labels = c.labels ?? { preparedFor: c.clientLabel, by: c.ownerLabels[0] }
    let by = 456
    centered(labels.preparedFor.toUpperCase(), by, lab, MUTED)
    by += 20
    const cs: Style = { font: 'serif', size: 22 }
    const cl = wrap(c.clientName, 400, cs).slice(0, 2)
    for (const l of cl) {
      const last = l[l.length - 1] as Token
      drawLine(l, (W - last.x - width(last.t, cs)) / 2, by, 26, cs)
      by += 26
    }
    by += 18
    centered(labels.by.toUpperCase(), by, lab, MUTED)
    by += 18
    centered(c.owner.name, by, { font: 'serifM', size: 15 }, ACCENT)

    centered(c.tagline, 628, { font: 'sansI', size: 8, cs: 0.2 }, MUTED)
    const cols: [string, string][] = [[c.ownerLabels[1], c.owner.phone], [c.ownerLabels[2], c.owner.email], [c.ownerLabels[3], c.owner.city]]
    const g = 22
    const colW = (CW - g * 2) / 3
    cols.forEach(([k, v], i) => {
      const x = M + i * (colW + g)
      put(k.toUpperCase(), x, 672, { font: 'sansB', size: 6, cs: 1.4 }, MUTED)
      const vs: Style = { font: 'sans', size: 8.8 }
      const ls = wrap(v || '—', colW, vs).slice(0, 2)
      ls.forEach((l, j) => drawLine(l, x, 685 + j * 12, 12, vs))
    })
  }

  function thanks(t: { heading: string; lines: string[] }) {
    doc.addPage()
    frame(true)
    centered(t.heading, 285, { font: 'serifI', size: 66 }, INK)
    ornament(W / 2, 392)
    let ty = 424
    t.lines.forEach((l, i) => {
      if (i === 0) {
        centered(l, ty, { font: 'serif', size: 20 }, ACCENT)
        ty += 30
      } else {
        centered(l, ty, { font: 'sans', size: 9.5, cs: 0.8 }, MUTED)
        ty += 17
      }
    })
  }

  function decorate() {
    const pages = doc.bufferedPageRange().count
    for (const idx of interior) {
      doc.switchToPage(idx)
      const sub = d.cover.subtitle.toUpperCase()
      const subS: Style = { font: 'sansS', size: 6.8, cs: 1.5 }
      const subW = width(sub, subS)
      put(sub, W - M - subW + 1.5, 46, subS, MUTED)
      const hs: Style = { font: 'serif', size: 12 }
      let title = clean(d.title || d.headerLabel)
      while (title.length > 1 && width(title, hs) > CW - subW - 24) title = `${title.slice(0, -2).trimEnd()}…`
      put(title, M, 41, hs, ACCENT)
      hline(M, M + CW, 64, LINE, 0.5)
      const fs: Style = { font: 'sans', size: 7, cs: 0.3 }
      put(`${d.ref}  ·  SHA-256 ${d.hash.slice(0, 12)}`, M, H - 52, fs, MUTED)
      const pl = d.pageLabel.replace('{page}', String(idx + 1)).replace('{pages}', String(pages))
      put(pl, W - M - width(pl, fs), H - 52, fs, MUTED)
    }
  }

  cover()
  newPage()
  for (const b of d.blocks) block(b)
  y += 10
  signatures()
  if (d.evidence) evidence(d.evidence)
  if (d.thanks) thanks(d.thanks)
  decorate()
  doc.end()
  return done
}

import assert from 'node:assert/strict'
import { inflateSync } from 'node:zlib'
import { test } from 'node:test'
import { buildPdf } from './pdf.ts'
import type { PdfDoc } from './pdf.ts'

const strokes = { w: 300, h: 120, strokes: [[10, 10, 50, 60, 120, 20, 200, 100], [250, 20, 250, 20]] }
const base: PdfDoc = {
  title: 'Contrato de prestación',
  headerLabel: 'Contrato',
  cover: {
    date: '5 de marzo de 2026', subtitle: 'Prestación de servicios', clientLabel: 'Cliente', clientName: 'Ana Gómez',
    tagline: 'Documento sujeto a firma electrónica.', owner: { name: 'Stiven Colorado', phone: '300 000 0000', email: 's@x.co', city: 'Medellín' },
    ownerLabels: ['Prestador', 'Teléfono', 'Correo', 'Ciudad'],
  },
  ref: '#7 · v2',
  hash: 'abcdef0123456789'.repeat(4),
  pageLabel: 'Página {page} de {pages}',
  signaturesHeading: 'Firmas de las partes',
  blocks: [
    { type: 'h1', text: 'CONTRATO DE PRESTACIÓN DE SERVICIOS' },
    { type: 'h2', text: 'Cláusula primera', num: '1' },
    { type: 'p', text: 'El señor Peña “acepta” — según el artículo 183… € 100.', num: '1.1' },
    { type: 'table', header: true, rows: [['Concepto', 'Condición', 'Monto'], ['Anticipo', 'A la firma', '$ 1.000'], ['Total', '', '$ 2.000']] },
    { type: 'li', text: 'Entrega (parcial) \\ con paréntesis' },
  ],
  signatures: [
    { label: 'EL PRESTADOR', name: 'Stiven', docLine: 'CC 1', dateLine: '1 de enero', strokes },
    { label: 'EL CLIENTE', name: 'Ana', docLine: 'NIT 2', dateLine: 'Pendiente', strokes: null },
  ],
  thanks: { heading: 'Gracias', lines: ['Stiven Colorado'] },
  evidence: { heading: 'Registro de firma electrónica', rows: [['Hash', 'a'.repeat(64)], ['Agente', 'Mozilla/5.0 '.repeat(20)]] },
}

function contents(pdf: Buffer): string[] {
  const text = pdf.toString('latin1')
  const out: string[] = []
  for (const m of text.matchAll(/<< \/Length (\d+) \/Filter \/FlateDecode >>\nstream\n/g)) {
    const start = (m.index as number) + m[0].length
    out.push(inflateSync(pdf.subarray(start, start + Number(m[1]))).toString('latin1'))
  }
  return out
}

test('estructura válida: cabecera, xref con offsets reales y startxref', () => {
  const pdf = buildPdf(base)
  const text = pdf.toString('latin1')
  assert.ok(text.startsWith('%PDF-1.4\n'))
  assert.ok(text.trimEnd().endsWith('%%EOF'))
  const start = Number(/startxref\n(\d+)\n%%EOF/.exec(text)![1])
  assert.equal(text.slice(start, start + 4), 'xref')
  const size = Number(/\/Size (\d+)/.exec(text)![1])
  const rows = text.slice(start).split('\n').slice(2, 2 + size)
  assert.equal(rows.length, size)
  assert.ok(rows.every((r) => r.length === 19))
  rows.slice(1).forEach((r, i) => assert.ok(text.slice(Number(r.slice(0, 10))).startsWith(`${i + 1} 0 obj`)))
  assert.equal([...text.matchAll(/\/Type \/Page[^s]/g)].length, contents(pdf).length)
})

test('texto en WinAnsi con acentos, comillas tipográficas y sin escapes rotos', () => {
  const first = contents(buildPdf(base)).join('\n')
  const hex = [...first.matchAll(/<([0-9a-f]+)> Tj/g)].map((m) => Buffer.from(m[1]!, 'hex').toString('latin1'))
  assert.ok(hex.includes('CONTRATO DE PRESTACI\xD3N DE SERVICIOS'))
  assert.ok(hex.some((t) => t.includes('se\xF1or Pe\xF1a \x93acepta\x94 \x97 seg\xFAn') && t.includes('183\x85 \x80 100')))
  assert.ok(hex.some((t) => t.includes('(parcial) \\ con')))
})

test('firma: trazos como m/l/S escalados dentro de la caja y punto aislado', () => {
  const first = contents(buildPdf(base)).join('\n')
  const m = /1\.3 w 1 J 1 j (.+) Q/.exec(first)!
  const ops = m[1]!.split(' S').filter(Boolean)
  assert.equal(ops.length, 2)
  assert.match(ops[0]!, /^[\d. ]+ m [\d. ]+ l/)
  assert.equal((ops[1]!.match(/ l/g) ?? []).length, 1)
  const nums = (m[1]!.match(/\d+(\.\d+)? \d+(\.\d+)?(?= [ml])/g) ?? []).map((p) => p.split(' ').map(Number))
  assert.ok(nums.every(([x, y]) => x! >= 64 && x! <= 280 && y! > 0 && y! < 792))
})

test('el texto largo se corta en líneas y salta de página; footer con numeración', () => {
  const long = 'palabra '.repeat(2500)
  const pdf = buildPdf({ ...base, blocks: [{ type: 'p', text: long }], signatures: [], thanks: undefined, evidence: undefined })
  const pages = contents(pdf)
  assert.ok(pages.length >= 4)
  assert.match(pages.at(-1)!, new RegExp(Buffer.from('Página', 'latin1').toString('hex')))
  const widths = [...pages[1]!.matchAll(/Td <([0-9a-f]+)> Tj/g)].map((x) => x[1]!.length / 2)
  assert.ok(Math.max(...widths) < 120)
})

test('borrador: marca de agua rotada 45 grados; palabra sin espacios muy larga no se desborda', () => {
  const first = contents(buildPdf({ ...base, watermark: 'BORRADOR', blocks: [{ type: 'p', text: 'x'.repeat(400) }] }))[1]!
  assert.match(first, /0\.7071 0\.7071 -0\.7071 0\.7071 306 396 cm/)
  assert.ok(first.indexOf('cm BT') < first.indexOf('/F1 10 Tf'))
})

test('portada y hoja final crema; páginas interiores con encabezado y pie', () => {
  const pages = contents(buildPdf(base))
  const cream = '0.93 0.92 0.87 rg 0 0 612 792 re f'
  assert.ok(pages[0]!.startsWith(cream))
  assert.ok(pages.at(-1)!.startsWith(cream))
  assert.ok(!pages[1]!.includes(cream))
  const hex = (t: string) => Buffer.from(t, 'latin1').toString('hex')
  assert.ok(pages[1]!.includes(hex('Contrato')))
  assert.ok(pages[1]!.includes(hex('#7 · v2 · SHA-256 abcdef012345').replace('c2b7', 'b7')))
  assert.ok(pages.at(-1)!.includes(hex('Gracias')))
  const noThanks = contents(buildPdf({ ...base, thanks: undefined }))
  assert.ok(!noThanks.at(-1)!.startsWith(cream))
})

test('tabla: líneas horizontales, última columna a la derecha y fila total en negrita', () => {
  const body = contents(buildPdf(base))[1]!
  assert.ok((body.match(/ l S Q/g) ?? []).length >= 8)
  const hex = (t: string) => Buffer.from(t, 'latin1').toString('hex')
  assert.match(body, new RegExp(`/F2 9 Tf [\\d. ]+ Td <${hex('Total')}>`))
  const cell = new RegExp(`/F1 9 Tf ([\\d.]+) [\\d.]+ Td <${hex('$ 1.000')}>`).exec(body)!
  assert.ok(Number(cell[1]) > 440)
})

test('numeración: sección y cláusulas aparecen como texto', () => {
  const body = contents(buildPdf(base))[1]!
  const hex = (t: string) => Buffer.from(t, 'latin1').toString('hex')
  assert.ok(body.includes(`<${hex('1.')}> Tj`))
  assert.ok(body.includes(`<${hex('1.1')}> Tj`))
})

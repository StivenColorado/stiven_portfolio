import assert from 'node:assert/strict'
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

const pageCount = (pdf: Buffer) => [...pdf.toString('latin1').matchAll(/\/Type \/Page\b(?!s)/g)].length
const fonts = (pdf: Buffer) => [...pdf.toString('latin1').matchAll(/\/BaseFont \/[A-Z]{6}\+([A-Za-z-]+)/g)].map((m) => m[1]!)

test('PDF válido con fuentes personalizadas incrustadas y metadatos', async () => {
  const pdf = await buildPdf(base)
  const text = pdf.toString('latin1')
  assert.ok(text.startsWith('%PDF-'))
  assert.ok(text.trimEnd().endsWith('%%EOF'))
  const names = fonts(pdf).join(' ')
  assert.match(names, /Cormorant/)
  assert.match(names, /Nunito/)
  assert.match(text, /\/Title \d+ 0 R/)
  assert.ok(pageCount(pdf) >= 4)
})

test('el texto largo salta de página y numera "Página i de N"', async () => {
  const long = 'palabra '.repeat(2500)
  const short = await buildPdf({ ...base, signatures: [], thanks: undefined, evidence: undefined })
  const pdf = await buildPdf({ ...base, blocks: [{ type: 'p', text: long }], signatures: [], thanks: undefined, evidence: undefined })
  assert.ok(pageCount(pdf) >= pageCount(short) + 3)
})

test('portada, evidencia y hoja final dependen de los datos', async () => {
  const full = pageCount(await buildPdf(base))
  assert.equal(pageCount(await buildPdf({ ...base, thanks: undefined })), full - 1)
  assert.equal(pageCount(await buildPdf({ ...base, evidence: undefined })), full - 1)
})

test('borrador con marca de agua, palabras larguísimas, [[variables]] y tablas con celdas largas no rompen', async () => {
  const pdf = await buildPdf({
    ...base,
    watermark: 'BORRADOR',
    title: 'Un título larguísimo '.repeat(12),
    blocks: [
      { type: 'p', text: `${'x'.repeat(400)} y [[faltante]] y ${'ñ'.repeat(10)}`, num: '1.1' },
      { type: 'table', header: true, rows: [['Concepto', 'Detalle', 'Monto'], ['A', 'detalle '.repeat(60), '$ 1'], ['Total', '', '$ 2']] },
      { type: 'table', header: false, rows: [['solo', 'filas']] },
      { type: 'li', text: 'Entrega (parcial) \\ con paréntesis' },
    ],
  })
  assert.ok(pageCount(pdf) >= 3)
})

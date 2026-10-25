import assert from 'node:assert/strict'
import { test } from 'node:test'
import { documentBlocks, extractVars, fill, formatValue, missingVars, toBlocks } from './contract-text.ts'

test('extractVars devuelve claves únicas en orden y descarta formatos inválidos', () => {
  assert.deepEqual(extractVars('{{a}} y {{b_2}} y {{a}} {{A}} {{ x }} {{1z}}'), ['a', 'b_2'])
})

test('fill reemplaza, deja [[clave]] sin valor y no reinterpreta el valor', () => {
  const out = fill('Hola {{n}} {{x}} {{vacio}}', { n: ' Ana ', vacio: '  ', x: '{{n}}' })
  assert.equal(out, 'Hola Ana {{n}} [[vacio]]')
  assert.deepEqual(missingVars(out), ['vacio'])
})

test('formatValue da formato colombiano a dinero y fechas, y respeta el idioma', () => {
  assert.match(formatValue('5000000', 'money', 'es', 'COP'), /5\.000\.000/)
  assert.match(formatValue('1500.5', 'money', 'en', 'USD'), /\$1,500\.50/)
  assert.equal(formatValue('2026-03-05', 'date', 'es'), '5 de marzo de 2026')
  assert.equal(formatValue('2026-03-05', 'date', 'en'), 'March 5, 2026')
  assert.equal(formatValue('abc', 'money'), 'abc')
  assert.equal(formatValue('hola', 'text'), 'hola')
})

test('fill aplica tipos y la moneda del documento', () => {
  const out = fill('{{monto}} {{moneda}} el {{f}}', { monto: '2000', moneda: 'USD', f: '2026-01-02' }, { types: { monto: 'money', f: 'date' }, lang: 'es' })
  assert.match(out, /US\$\s?2\.000,00 USD el 2 de enero de 2026/)
})

test('toBlocks reconoce títulos, viñetas y une líneas contiguas en un párrafo', () => {
  const blocks = toBlocks('# Título\n\n## Sec\nlinea uno\nlinea dos\n\n- a\n- b\r\n\nfin')
  assert.deepEqual(blocks, [
    { type: 'h1', text: 'Título' },
    { type: 'h2', text: 'Sec' },
    { type: 'p', text: 'linea uno linea dos' },
    { type: 'li', text: 'a' },
    { type: 'li', text: 'b' },
    { type: 'p', text: 'fin' },
  ])
})

test('toBlocks agrupa filas | a | b | en tabla con encabezado y descarta el separador', () => {
  assert.deepEqual(toBlocks('antes\n| A | B |\n|---|---|\n| 1 | 2 |\n| Total | 3 |\ndespués'), [
    { type: 'p', text: 'antes' },
    { type: 'table', header: true, rows: [['A', 'B'], ['1', '2'], ['Total', '3']] },
    { type: 'p', text: 'después' },
  ])
  assert.equal((toBlocks('| a | b |\n| c | d |')[0] as { header: boolean }).header, false)
})

test('documentBlocks numera secciones y párrafos pero no viñetas ni la introducción', () => {
  const b = documentBlocks('# T\n\nintro\n\n## Uno\n\nuno a\n\n- v\n\nuno b\n\n## Dos\n\ndos a')
  assert.deepEqual(b.map((x) => ('num' in x ? x.num : undefined)), [undefined, undefined, '1', '1.1', undefined, '1.2', '2', '2.1'])
})

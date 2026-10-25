import type { TemplateVar } from '../../contracts-validate.ts'

const v = (key: string, label: string, type: TemplateVar['type'], extra: Partial<TemplateVar> = {}): TemplateVar => ({ key, label, type, ...extra })

export const VARS = {
  objeto: v('objeto', 'Objeto del contrato', 'textarea', { required: true }),
  alcance: v('alcance', 'Alcance y entregables', 'textarea', { required: true }),
  entregables: v('entregables', 'Entregables', 'textarea', { required: true }),
  monto: v('monto', 'Valor total', 'money', { required: true }),
  moneda: v('moneda', 'Moneda (código ISO)', 'text', { default: 'COP' }),
  hitos: v('hitos', 'Plan de pagos (tabla: concepto | condición | monto)', 'textarea', {
    default: '| Concepto | Condición | Porcentaje |\n|---|---|---|\n| Anticipo | A la firma del contrato | 50 % |\n| Entrega final | Contra la aceptación del entregable final | 50 % |\n| Total | | 100 % |',
  }),
  plazo: v('plazo', 'Plazo de ejecución', 'text', { default: '30 días calendario' }),
  fecha_inicio: v('fecha_inicio', 'Fecha de inicio', 'date', { required: true }),
  garantia_dias: v('garantia_dias', 'Días de garantía', 'number', { default: '60' }),
  penalidad: v('penalidad', 'Penalidad por incumplimiento', 'text', { default: 'el diez por ciento (10 %) del valor total del contrato' }),
  jurisdiccion: v('jurisdiccion', 'Ciudad de domicilio contractual', 'text', { default: 'Bogotá D. C.' }),
  rondas_revision: v('rondas_revision', 'Rondas de revisión incluidas', 'number', { default: '2' }),
  vigencia_dias: v('vigencia_dias', 'Validez de la propuesta', 'text', { default: '15 días' }),
  vigencia_meses: v('vigencia_meses', 'Vigencia', 'text', { default: '12 meses' }),
} satisfies Record<string, TemplateVar>

export type SeedTemplate = {
  kind: 'services' | 'sow' | 'sla' | 'nda' | 'acceptance' | 'change_order' | 'retainer' | 'data_processing'
  lang: 'es'
  name: string
  body: string
  variables: TemplateVar[]
}
export { v }

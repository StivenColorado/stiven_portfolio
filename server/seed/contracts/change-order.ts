import { v } from './vars.ts'
import type { SeedTemplate } from './vars.ts'

export const changeOrder: SeedTemplate = {
  kind: 'change_order',
  lang: 'es',
  name: 'Orden de cambio',
  variables: [
    v('cambio_descripcion', 'Descripción del cambio', 'textarea', { required: true }),
    v('cambio_costo', 'Impacto en el costo', 'money', { required: true }),
    v('cambio_plazo', 'Impacto en el plazo', 'text', { default: 'Sin cambios en el plazo' }),
    v('monto', 'Nuevo valor total del contrato', 'money', { required: true }),
    v('moneda', 'Moneda (código ISO)', 'text', { default: 'COP' }),
  ],
  body: `# ORDEN DE CAMBIO

Esta orden de cambio modifica el contrato {{contrato_ref}}, celebrado entre {{prestador}} ({{prestador_tipo_doc}} {{prestador_documento}}), en adelante EL PRESTADOR, y {{cliente}} ({{cliente_tipo_doc}} {{cliente_documento}}), en adelante EL CLIENTE.

## Descripción del cambio

{{cambio_descripcion}}

## Impacto en el costo

El cambio descrito tiene el siguiente impacto económico, antes de impuestos:

| Concepto | Detalle | Valor |
|---|---|---|
| Costo adicional del cambio | Según la descripción de la sección 1 | {{cambio_costo}} {{moneda}} |
| Total del contrato con el cambio | Valor actualizado | {{monto}} {{moneda}} |

El costo adicional se facturará y pagará en la forma que acuerden las partes por escrito o, a falta de acuerdo, junto con el siguiente pago pactado en el contrato.

## Impacto en el plazo

{{cambio_plazo}}

## Nuevo valor del contrato

Como consecuencia de esta orden de cambio, el valor total del contrato queda en {{monto}} {{moneda}}.

## Aprobación

EL CLIENTE aprueba el cambio, su costo y su impacto en el plazo, y autoriza a EL PRESTADOR a ejecutarlo. EL PRESTADOR no iniciará el trabajo adicional hasta que esta orden esté firmada por ambas partes.

## Efectos

Salvo lo modificado por esta orden, el contrato conserva plena vigencia. Esta orden hace parte integral del contrato y se rige por sus mismas cláusulas, incluidas las de propiedad intelectual, garantía y confidencialidad. Las partes aceptan firmarla electrónicamente, con los efectos de la Ley 527 de 1999 y el Decreto 2364 de 2012.`,
}

import { v } from './vars.ts'
import type { SeedTemplate } from './vars.ts'

export const acceptance: SeedTemplate = {
  kind: 'acceptance',
  lang: 'es',
  name: 'Acta de entrega y aceptación',
  variables: [
    v('entregables', 'Entregables recibidos (tabla)', 'textarea', { required: true, default: '| Entregable | Descripción | Estado |\n|---|---|---|\n| Primer entregable | Descripción breve | Entregado |' }),
    v('pruebas', 'Pruebas realizadas', 'textarea', { default: '- Revisión de las funcionalidades descritas en el alcance.\n- Pruebas de funcionamiento en los navegadores y dispositivos acordados.' }),
    v('observaciones', 'Observaciones', 'textarea', { default: 'Ninguna.' }),
    v('tipo_aceptacion', 'Tipo de aceptación', 'text', { default: 'aceptación total, sin reservas' }),
    v('garantia_dias', 'Días de garantía', 'number', { default: '60' }),
    v('saldo_pendiente', 'Saldo pendiente', 'text', { default: 'Según lo pactado en el contrato de referencia.' }),
  ],
  body: `# ACTA DE ENTREGA Y ACEPTACIÓN

En {{ciudad_firma}}, el {{fecha}}, {{prestador}} ({{prestador_tipo_doc}} {{prestador_documento}}), en adelante EL PRESTADOR, hace entrega a {{cliente}} ({{cliente_tipo_doc}} {{cliente_documento}}), en adelante EL CLIENTE, representado(a) por {{cliente_representante}}, de los productos descritos en esta acta, en ejecución del contrato {{contrato_ref}}.

## Contrato de referencia

Esta acta se emite en desarrollo del contrato {{contrato_ref}} y hace parte integral de él.

## Entregables recibidos

{{entregables}}

## Pruebas y verificación

EL CLIENTE verificó los entregables mediante lo siguiente:

{{pruebas}}

## Observaciones

{{observaciones}}

## Aceptación

EL CLIENTE declara que recibe los entregables a satisfacción, en los siguientes términos:

| Concepto | Detalle |
|---|---|
| Tipo de aceptación | {{tipo_aceptacion}} |
| Fecha de aceptación | {{fecha}} |
| Inicio de la garantía | {{fecha}} |
| Días de garantía | {{garantia_dias}} |

Si se hubieran formulado reservas, EL PRESTADOR las atenderá dentro del periodo de garantía y la aceptación definitiva se entenderá otorgada cuando se corrijan.

## Garantía

Desde la fecha de esta acta empieza a correr la garantía de {{garantia_dias}} días calendario prevista en el contrato, que cubre la corrección de defectos de funcionamiento sin costo para EL CLIENTE, en los términos allí establecidos.

## Saldo pendiente

{{saldo_pendiente}} La cesión de derechos patrimoniales y las demás obligaciones de pago se rigen por el contrato de referencia.

## Firma electrónica

Las partes aceptan firmar esta acta electrónicamente, con los efectos de la Ley 527 de 1999 y el Decreto 2364 de 2012.`,
}

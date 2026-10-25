import { VARS, v } from './vars.ts'
import type { SeedTemplate } from './vars.ts'

export const sow: SeedTemplate = {
  kind: 'sow',
  lang: 'es',
  name: 'Propuesta y alcance del trabajo (Statement of Work)',
  variables: [
    v('contexto', 'Contexto del proyecto', 'textarea', { required: true }),
    v('objetivos', 'Objetivos', 'textarea', { required: true }),
    VARS.alcance,
    v('entregables', 'Entregables (tabla)', 'textarea', { required: true, default: '| Entregable | Descripción | Estado |\n|---|---|---|\n| Primer entregable | Descripción breve | Pendiente |' }),
    v('fuera_alcance', 'Fuera de alcance', 'textarea', {
      default: '- Soporte posterior al periodo de garantía.\n- Redacción de contenidos, fotografía y producción audiovisual.\n- Costos de dominios, alojamiento y licencias de terceros.',
    }),
    VARS.plazo, VARS.fecha_inicio, VARS.monto, VARS.moneda, VARS.hitos, VARS.vigencia_dias,
    v('supuestos', 'Supuestos y dependencias del cliente', 'textarea', {
      default: '- El cliente entregará contenidos y accesos a tiempo.\n- Habrá una única persona con capacidad de decisión por parte del cliente.\n- Los tiempos de respuesta del cliente no superarán cinco días hábiles.',
    }),
  ],
  body: `# PROPUESTA Y ALCANCE DEL TRABAJO

Documento preparado por {{prestador}} para {{cliente}} ({{cliente_tipo_doc}} {{cliente_documento}}), a la atención de {{cliente_representante}}. Fecha: {{fecha}}.

## Contexto

{{contexto}}

## Objetivos

{{objetivos}}

## Alcance

El trabajo propuesto comprende lo siguiente:

{{alcance}}

## Entregables

{{entregables}}

## Fuera de alcance

Los siguientes elementos no están incluidos en esta propuesta y, de requerirse, se cotizarán por separado:

{{fuera_alcance}}

## Cronograma

El trabajo se ejecutará en un plazo estimado de {{plazo}}, contado a partir del {{fecha_inicio}}. Las fechas dependen del cumplimiento de los supuestos de la sección siguiente.

## Supuestos y dependencias del cliente

{{supuestos}}

## Inversión y forma de pago

La inversión total por el alcance descrito es de {{monto}} {{moneda}}, antes de impuestos, pagadera así:

{{hitos}}

## Validez de la propuesta

Esta propuesta tiene una validez de {{vigencia_dias}} calendario contados desde su fecha. Vencido ese plazo, el valor, el cronograma y la disponibilidad podrán variar.

## Aceptación

Al firmar este documento, {{cliente}} acepta el alcance, el cronograma y la inversión descritos y autoriza el inicio del trabajo. Esta propuesta se formalizará mediante el contrato de prestación de servicios correspondiente, cuyos términos prevalecerán sobre este documento en caso de diferencia. Las partes aceptan firmarlo electrónicamente, con los efectos de la Ley 527 de 1999 y el Decreto 2364 de 2012.`,
}

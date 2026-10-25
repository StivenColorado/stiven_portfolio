import { VARS, v } from './vars.ts'
import type { SeedTemplate } from './vars.ts'

export const sla: SeedTemplate = {
  kind: 'sla',
  lang: 'es',
  name: 'Acuerdo de nivel de servicio y soporte (SLA)',
  variables: [
    v('sistema', 'Sistema o producto soportado', 'textarea', { required: true }),
    v('canal_soporte', 'Canal de soporte', 'text', { default: 'el correo electrónico del prestador y el canal de mensajería acordado' }),
    v('sla_horario', 'Horario de soporte', 'text', { default: 'lunes a viernes de 8:00 a. m. a 6:00 p. m., hora de Colombia, excepto festivos' }),
    v('sla_respuesta_horas', 'Horas de respuesta (severidad crítica)', 'number', { default: '2' }),
    v('sla_resolucion_horas', 'Horas de resolución (severidad crítica)', 'number', { default: '8' }),
    v('disponibilidad', 'Disponibilidad objetivo', 'text', { default: '99 %' }),
    v('credito', 'Crédito por incumplimiento', 'text', { default: 'el cinco por ciento (5 %) de la mensualidad por cada incumplimiento de severidad crítica, con un máximo del veinte por ciento (20 %)' }),
    VARS.vigencia_meses, VARS.fecha_inicio,
  ],
  body: `# ACUERDO DE NIVEL DE SERVICIO Y SOPORTE

En {{ciudad_firma}}, a {{fecha}}, entre {{prestador}} ({{prestador_tipo_doc}} {{prestador_documento}}), en adelante EL PRESTADOR, y {{cliente}} ({{cliente_tipo_doc}} {{cliente_documento}}), en adelante EL CLIENTE, se acuerda el siguiente nivel de servicio y soporte.

## Alcance

EL PRESTADOR brindará soporte técnico y mantenimiento correctivo sobre el siguiente sistema o producto:

{{sistema}}

## Canales y horario de atención

Las solicitudes se reportarán por {{canal_soporte}}, indicando una descripción del problema, los pasos para reproducirlo y, de ser posible, capturas de pantalla. El horario de atención es de {{sla_horario}}. Las solicitudes recibidas fuera de ese horario se contarán desde la siguiente hora hábil, salvo las de severidad crítica, que se atenderán según lo previsto en la sección 3.

## Severidades y tiempos

Las incidencias se clasifican y atienden de la siguiente manera:

| Severidad | Descripción | Respuesta | Resolución |
|---|---|---|---|
| Crítica | El sistema está caído o una función esencial no opera y no hay alternativa | {{sla_respuesta_horas}} h | {{sla_resolucion_horas}} h |
| Alta | Una función importante falla o opera degradada, pero existe una alternativa | El doble de la crítica | El doble de la crítica |
| Media | Falla parcial o errores que no impiden operar | El cuádruple de la crítica | El cuádruple de la crítica |
| Baja | Consultas, mejoras cosméticas o errores menores | 2 días hábiles | Siguiente ciclo de mantenimiento |

Los tiempos de respuesta se cuentan desde que EL CLIENTE reporta la incidencia por el canal acordado, con la información suficiente para atenderla, y se miden en horas hábiles, salvo para las críticas.

## Mantenimiento

EL PRESTADOR podrá realizar mantenimientos preventivos y actualizaciones de seguridad, avisando a EL CLIENTE con al menos dos (2) días de antelación cuando impliquen interrupción del servicio. Las ventanas de mantenimiento programadas no se contabilizan como indisponibilidad.

## Exclusiones

Este acuerdo cubre la corrección de errores (defectos de funcionamiento frente a lo especificado). No cubre:

- Nuevas funcionalidades, cambios de diseño o de reglas de negocio, que se cotizarán por separado.
- Fallas causadas por modificaciones de terceros, mal uso, o por cambios en servicios y plataformas externas.
- Incidencias derivadas de la infraestructura, el alojamiento o los proveedores de EL CLIENTE, salvo que EL PRESTADOR los administre.
- La recuperación de datos perdidos por causas ajenas a EL PRESTADOR.

## Disponibilidad

EL PRESTADOR procurará una disponibilidad mensual objetivo de {{disponibilidad}} para los componentes que administre directamente, excluyendo el mantenimiento programado, la fuerza mayor y las fallas de terceros.

## Créditos por incumplimiento

Si EL PRESTADOR incumple los tiempos de severidad crítica por causas que le sean imputables, EL CLIENTE tendrá derecho a un crédito de {{credito}}, aplicable a la siguiente facturación. Este crédito es la única compensación por el incumplimiento de los niveles de servicio.

## Vigencia

Este acuerdo rige desde el {{fecha_inicio}} por {{vigencia_meses}} meses y se renovará por periodos iguales, salvo que alguna de las partes comunique por escrito su decisión de no renovarlo con al menos treinta (30) días de anticipación.

## Firma electrónica

Las partes aceptan firmar este documento electrónicamente, con los efectos de la Ley 527 de 1999 y el Decreto 2364 de 2012.`,
}

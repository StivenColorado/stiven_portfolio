import { VARS, v } from './vars.ts'
import type { SeedTemplate } from './vars.ts'

export const retainer: SeedTemplate = {
  kind: 'retainer',
  lang: 'es',
  name: 'Contrato de mantenimiento mensual (retainer)',
  variables: [
    v('servicios_incluidos', 'Servicios incluidos', 'textarea', {
      required: true,
      default: '- Corrección de errores.\n- Actualizaciones de seguridad y de dependencias.\n- Pequeñas mejoras y ajustes de contenido.\n- Monitoreo básico y copias de seguridad.',
    }),
    v('horas_mensuales', 'Horas incluidas por mes', 'number', { required: true, default: '10' }),
    v('monto', 'Tarifa mensual', 'money', { required: true }),
    VARS.moneda,
    v('tarifa_hora', 'Tarifa por hora adicional', 'money', { required: true }),
    VARS.fecha_inicio,
    v('preaviso_dias', 'Días de preaviso para terminar o no renovar', 'number', { default: '30' }),
    VARS.jurisdiccion,
  ],
  body: `# CONTRATO DE MANTENIMIENTO MENSUAL

En {{ciudad_firma}}, a {{fecha}}, entre {{prestador}} ({{prestador_tipo_doc}} {{prestador_documento}}), en adelante EL PRESTADOR, y {{cliente}} ({{cliente_tipo_doc}} {{cliente_documento}}), representado(a) por {{cliente_representante}}, en adelante EL CLIENTE, se celebra el presente contrato de mantenimiento y soporte mensual, que se regirá por las siguientes cláusulas.

## Objeto y servicios incluidos

EL PRESTADOR prestará a EL CLIENTE servicios mensuales de mantenimiento y soporte sobre sus sistemas digitales. Los servicios incluidos son:

{{servicios_incluidos}}

## Bolsa de horas

Las condiciones económicas del servicio son las siguientes:

| Concepto | Detalle | Valor |
|---|---|---|
| Tarifa mensual | Hasta {{horas_mensuales}} horas de trabajo por mes | {{monto}} {{moneda}} |
| Hora adicional | Previa aprobación escrita de EL CLIENTE | {{tarifa_hora}} {{moneda}} |

Las horas no utilizadas en un mes no se acumulan ni se compensan en meses posteriores, ni dan derecho a reembolso. Las horas se registran en incrementos de quince (15) minutos y EL PRESTADOR informará su consumo a solicitud de EL CLIENTE.

## Trabajo no incluido y horas adicionales

No están incluidos el desarrollo de nuevas funcionalidades de gran tamaño, los rediseños, ni los costos de terceros (alojamiento, dominios, licencias, servicios en la nube), que se cotizarán o se pagarán por separado. El trabajo que exceda la bolsa mensual, previamente aprobado por EL CLIENTE por escrito, se cobrará a razón de {{tarifa_hora}} {{moneda}} por hora adicional.

## Valor, facturación y pago

La tarifa mensual es de {{monto}} {{moneda}}, antes de impuestos. EL PRESTADOR la facturará por mes anticipado y EL CLIENTE la pagará dentro de los cinco (5) días hábiles siguientes a la factura o cuenta de cobro. El retardo causará intereses de mora a la tasa máxima legal permitida y facultará a EL PRESTADOR para suspender el servicio hasta que se ponga al día.

## Vigencia, renovación y terminación

El contrato rige desde el {{fecha_inicio}} por un periodo inicial de un (1) mes y se renovará automáticamente por periodos iguales. Cualquiera de las partes podrá darlo por terminado, sin penalidad, con un preaviso escrito de {{preaviso_dias}} días. Si EL CLIENTE no usa los servicios, la tarifa se sigue causando hasta que termine el contrato.

## Obligaciones del cliente

EL CLIENTE otorgará los accesos necesarios, atenderá oportunamente las consultas y mantendrá actualizados sus medios de contacto. EL PRESTADOR no responde por demoras causadas por la falta de accesos o de respuesta.

## Propiedad intelectual y confidencialidad

Los desarrollos realizados bajo este contrato para EL CLIENTE se rigen por las reglas de cesión de derechos patrimoniales del contrato principal o, en su defecto, se ceden a EL CLIENTE una vez pagados, conforme al artículo 183 de la Ley 23 de 1982, modificado por el artículo 30 de la Ley 1450 de 2011. Cada parte guardará reserva sobre la información de la otra a la que acceda por razón de este contrato.

## Datos personales

Cuando EL PRESTADOR acceda a datos personales de los que EL CLIENTE es responsable, los tratará como encargado, con sujeción a la Ley 1581 de 2012, el Decreto 1377 de 2013 y las instrucciones de EL CLIENTE.

## Independencia y limitación de responsabilidad

EL PRESTADOR actúa como contratista independiente, sin relación laboral con EL CLIENTE, conforme al artículo 34 del Código Sustantivo del Trabajo. Su responsabilidad total no excederá el valor pagado por EL CLIENTE en los tres (3) meses anteriores al hecho, y no responde por lucro cesante, pérdida de datos ni por fallas de servicios de terceros fuera de su control, salvo dolo o culpa grave.

## Controversias y firma electrónica

Las diferencias se intentarán resolver directamente y, en su defecto, mediante conciliación, con domicilio contractual en {{jurisdiccion}}. Las partes aceptan firmar este contrato electrónicamente, con los efectos de la Ley 527 de 1999 y el Decreto 2364 de 2012.`,
}

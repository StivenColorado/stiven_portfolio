import { VARS, v } from './vars.ts'
import type { SeedTemplate } from './vars.ts'

export const nda: SeedTemplate = {
  kind: 'nda',
  lang: 'es',
  name: 'Acuerdo de confidencialidad (NDA)',
  variables: [
    v('objeto', 'Finalidad de la divulgación', 'textarea', { required: true }),
    v('vigencia_meses', 'Duración de la reserva (meses)', 'number', { default: '24' }),
    VARS.penalidad, VARS.jurisdiccion,
  ],
  body: `# ACUERDO DE CONFIDENCIALIDAD

En {{ciudad_firma}}, a {{fecha}}, entre {{prestador}} ({{prestador_tipo_doc}} {{prestador_documento}}) y {{cliente}} ({{cliente_tipo_doc}} {{cliente_documento}}), representado(a) por {{cliente_representante}}, en adelante las PARTES, se celebra el presente acuerdo de confidencialidad, que se regirá por las siguientes cláusulas.

## Finalidad

Las PARTES intercambiarán información confidencial con el fin de: {{objeto}} Esta información solo podrá usarse para esa finalidad.

## Información confidencial

Es información confidencial toda información técnica, comercial, financiera, estratégica, de clientes, código fuente, diseños, procesos, bases de datos, credenciales y cualquier otra que una PARTE (la divulgante) revele a la otra (la receptora), por escrito, de forma oral, electrónica o por cualquier medio, y que esté marcada como confidencial o que razonablemente deba entenderse como tal por su naturaleza o por las circunstancias de su divulgación.

## Exclusiones

No se considera información confidencial la que:

- Sea o llegue a ser de dominio público sin culpa de la parte receptora.
- Ya estuviera legítimamente en poder de la parte receptora antes de su divulgación, lo cual se pruebe con documentos.
- Sea recibida de un tercero con derecho a divulgarla, sin restricción de confidencialidad.
- Sea desarrollada de manera independiente por la parte receptora, sin usar la información confidencial.
- Deba revelarse por orden de autoridad competente, caso en el cual la parte receptora avisará a la divulgante, si la ley lo permite, y revelará solo lo estrictamente requerido.

## Obligaciones de la parte receptora

La parte receptora se obliga a: guardar la información confidencial con el mismo cuidado que emplea para la suya propia y, como mínimo, con un cuidado razonable; no divulgarla a terceros; limitar el acceso a quienes necesiten conocerla para la finalidad indicada y estén sujetos a obligaciones de confidencialidad equivalentes; no copiarla, descompilarla ni aplicar ingeniería inversa sobre ella; y avisar de inmediato cualquier uso o divulgación no autorizados.

## Propiedad y uso

La información confidencial sigue siendo de propiedad de la parte divulgante. Este acuerdo no concede licencia ni derecho alguno sobre patentes, derechos de autor, secretos empresariales ni otros derechos de propiedad intelectual, salvo el derecho limitado de uso para la finalidad indicada.

## Duración y supervivencia

Este acuerdo rige desde la fecha de su firma. Las obligaciones de confidencialidad se mantendrán durante {{vigencia_meses}} meses contados desde la terminación de la relación entre las PARTES o desde la última divulgación, lo que ocurra después. Respecto de los secretos empresariales, la reserva se mantendrá mientras conserven tal carácter.

## Devolución o destrucción

A solicitud escrita de la parte divulgante, o al terminar la relación, la parte receptora devolverá o destruirá la información confidencial y sus copias y lo certificará por escrito, salvo las copias que deba conservar por mandato legal, las cuales seguirán sujetas a este acuerdo.

## Incumplimiento y penalidad

El incumplimiento de este acuerdo obliga a la parte infractora a indemnizar los perjuicios causados y, además, a pagar a título de cláusula penal {{penalidad}}, conforme a los artículos 1592 y siguientes del Código Civil, sin perjuicio de las acciones legales y de las medidas cautelares que correspondan, incluidas las previstas en las normas sobre competencia desleal y secretos empresariales.

## Ley aplicable y controversias

Este acuerdo se rige por las leyes de la República de Colombia. Las diferencias se intentarán resolver por arreglo directo y, en su defecto, mediante conciliación, y las PARTES fijan como domicilio contractual la ciudad de {{jurisdiccion}}.

## Firma electrónica

Las PARTES aceptan firmar este acuerdo electrónicamente, con la validez y los efectos de la Ley 527 de 1999 y el Decreto 2364 de 2012.`,
}

import { VARS, v } from './vars.ts'
import type { SeedTemplate } from './vars.ts'

export const services: SeedTemplate = {
  kind: 'services',
  lang: 'es',
  name: 'Contrato de prestación de servicios de desarrollo de software',
  variables: [
    VARS.objeto, VARS.alcance, VARS.monto, VARS.moneda, VARS.hitos, VARS.plazo, VARS.fecha_inicio, VARS.garantia_dias,
    VARS.penalidad, VARS.jurisdiccion, VARS.rondas_revision,
    v('preaviso_dias', 'Días de preaviso para terminar', 'number', { default: '15' }),
  ],
  body: `# CONTRATO DE PRESTACIÓN DE SERVICIOS DE DESARROLLO DE SOFTWARE

En {{ciudad_firma}}, a {{fecha}}, entre los suscritos: de una parte, {{prestador}}, mayor de edad, identificado(a) con documento {{prestador_tipo_doc}} número {{prestador_documento}}, quien en adelante se denominará EL PRESTADOR; y de otra parte, {{cliente}}, identificado(a) con {{cliente_tipo_doc}} número {{cliente_documento}}, representado(a) por {{cliente_representante}}, quien en adelante se denominará EL CLIENTE, hemos acordado celebrar el presente contrato de prestación de servicios, que se regirá por las siguientes cláusulas y, en lo no previsto, por las normas civiles y comerciales colombianas.

## Objeto

EL PRESTADOR se obliga con EL CLIENTE, de manera independiente y con plena autonomía técnica y administrativa, a ejecutar el siguiente servicio: {{objeto}}

## Alcance y entregables

El servicio comprende exclusivamente lo descrito a continuación, que constituye el alcance acordado:

{{alcance}}

Cualquier funcionalidad, integración, diseño o actividad no descrita en esta cláusula se considera fuera del alcance. Si EL CLIENTE la requiere, las partes la acordarán por escrito mediante una orden de cambio que fijará su costo y su impacto en el plazo; mientras no se firme, EL PRESTADOR no estará obligado a ejecutarla.

## Obligaciones del prestador

- Ejecutar el servicio con la diligencia, el cuidado y las buenas prácticas propias de un profesional del desarrollo de software.
- Entregar los productos acordados dentro del plazo pactado y mantener informado a EL CLIENTE sobre el avance.
- Atender hasta {{rondas_revision}} rondas de revisión por entregable, entendidas como un conjunto consolidado de observaciones que EL CLIENTE remite en una sola comunicación.
- Guardar reserva sobre la información de EL CLIENTE a la que tenga acceso con ocasión del contrato.
- Informar oportunamente cualquier circunstancia que pueda afectar el plazo o la calidad del servicio.

## Obligaciones del cliente

- Suministrar a tiempo los contenidos, textos, imágenes, marcas, credenciales, accesos y demás insumos necesarios para ejecutar el servicio. Los retrasos en su entrega amplían el plazo en un tiempo igual al de la demora.
- Designar una persona de contacto con capacidad de decisión y responder las consultas y entregas en un término máximo de cinco (5) días hábiles.
- Revisar cada entregable y comunicar su aceptación u observaciones por escrito, incluido el correo electrónico. Si EL CLIENTE guarda silencio durante diez (10) días hábiles después de recibir un entregable, este se entenderá aceptado.
- Pagar oportunamente el valor pactado en la forma y fechas acordadas.
- Garantizar que tiene derecho a usar los contenidos, marcas y materiales que suministre, y responder por su licitud frente a terceros.

## Valor y forma de pago

El valor total del contrato es de {{monto}} {{moneda}}. Este valor se pagará así:

{{hitos}}

Salvo pacto en contrario, los valores se entienden antes de impuestos; si EL PRESTADOR está obligado a facturar IVA u otros tributos, se discriminarán en la factura o documento equivalente. Las retenciones que la ley imponga a EL CLIENTE se practicarán conforme a la normativa vigente. El retardo en el pago causará intereses de mora a la tasa máxima legal permitida y facultará a EL PRESTADOR para suspender el servicio hasta que se ponga al día.

## Plazo

El plazo de ejecución es de {{plazo}}, contado a partir del {{fecha_inicio}}, sujeto a la entrega oportuna de los insumos y accesos a cargo de EL CLIENTE y a lo previsto en la sección 4.

## Garantía

EL PRESTADOR garantiza la corrección de los defectos de funcionamiento (errores) frente a lo especificado en el alcance, sin costo para EL CLIENTE, durante {{garantia_dias}} días calendario contados desde la aceptación del entregable. La garantía no cubre fallas causadas por modificaciones realizadas por terceros, mal uso, cambios en servicios o plataformas externas, ni nuevas funcionalidades, las cuales se cotizarán por separado.

## Propiedad intelectual

Los derechos morales de autor sobre el software y demás obras creadas son irrenunciables y permanecen con EL PRESTADOR conforme a la ley. Una vez EL CLIENTE haya pagado la totalidad del valor del contrato, EL PRESTADOR le cede, de manera exclusiva, los derechos patrimoniales de autor sobre el código fuente y los entregables desarrollados específicamente para EL CLIENTE, para todo el territorio y por el término máximo de protección legal. Las partes dejan constancia de que esta cláusula consta por escrito como lo exigen el artículo 183 de la Ley 23 de 1982, modificado por el artículo 30 de la Ley 1450 de 2011.

La cesión no comprende las herramientas, librerías, componentes, plantillas y conocimientos previos de EL PRESTADOR que no se hayan creado para EL CLIENTE, sobre los cuales EL CLIENTE recibe una licencia de uso no exclusiva, perpetua e irrevocable, en la medida necesaria para operar el producto entregado. El software de terceros y de código abierto incluido en el desarrollo se rige por sus propias licencias, que EL CLIENTE declara conocer y aceptar.

Mientras no se haya pagado el cien por ciento (100 %) del valor del contrato, EL CLIENTE solo dispone de una licencia temporal de uso para pruebas y revisión, y no podrá publicar, explotar comercialmente ni transferir el producto a terceros.

## Portafolio

EL CLIENTE autoriza a EL PRESTADOR a mencionar el proyecto y a mostrar capturas o descripciones generales de este en su portafolio y medios de promoción, sin revelar información confidencial. EL CLIENTE podrá revocar esta autorización mediante comunicación escrita, caso en el cual EL PRESTADOR retirará el material en un plazo razonable.

## Confidencialidad

Cada parte se obliga a mantener en reserva la información técnica, comercial y financiera de la otra a la que acceda por razón de este contrato, a usarla solo para ejecutarlo y a no divulgarla a terceros sin autorización escrita, salvo orden de autoridad competente. Esta obligación subsiste por dos (2) años después de terminado el contrato.

## Tratamiento de datos personales

Cuando para la ejecución del servicio EL PRESTADOR deba tratar datos personales de los que EL CLIENTE es responsable, lo hará como encargado, de acuerdo con la Ley 1581 de 2012, el Decreto 1377 de 2013 y las instrucciones de EL CLIENTE. Las condiciones de ese tratamiento se rigen por el anexo de tratamiento de datos personales que las partes suscriban y que hará parte integral de este contrato.

## Independencia y ausencia de relación laboral

EL PRESTADOR actúa como contratista independiente, con libertad y autonomía técnica y directiva, utilizando sus propios medios, y sin subordinación ni horario impuesto. Por lo tanto, entre las partes no existe relación laboral, conforme al artículo 34 del Código Sustantivo del Trabajo. EL PRESTADOR es responsable de sus propios aportes al Sistema de Seguridad Social Integral y demás obligaciones legales.

## Limitación de responsabilidad

La responsabilidad total de EL PRESTADOR frente a EL CLIENTE por cualquier causa derivada de este contrato no excederá el valor efectivamente pagado por EL CLIENTE. EL PRESTADOR no responde por lucro cesante, pérdida de datos, interrupciones de negocio ni daños indirectos, ni por fallas de servicios de terceros (alojamiento, pasarelas de pago, proveedores de correo o de nube) que no estén bajo su control, salvo dolo o culpa grave.

## Terminación

El contrato termina por cumplimiento del objeto, por mutuo acuerdo o por decisión unilateral de cualquiera de las partes con un preaviso escrito de {{preaviso_dias}} días. También podrá terminarse por incumplimiento grave de la otra parte que no se subsane dentro de los cinco (5) días hábiles siguientes al requerimiento escrito. En caso de terminación anticipada, EL CLIENTE pagará el trabajo ejecutado y los gastos incurridos hasta la fecha, proporcionalmente al avance, y los derechos de que trata la sección 8 solo se cederán sobre lo efectivamente pagado.

## Cláusula penal

El incumplimiento de las obligaciones esenciales de este contrato por cualquiera de las partes dará lugar a una pena equivalente a {{penalidad}}, sin perjuicio de que la parte cumplida exija el cumplimiento de la obligación principal. Esta pena es una estimación anticipada de perjuicios en los términos de los artículos 1592 y siguientes del Código Civil y no excluye el cobro de los valores adeudados.

## Controversias y domicilio

Las diferencias que surjan se intentarán resolver directamente entre las partes y, de no lograrse un acuerdo en treinta (30) días, mediante conciliación ante un centro de conciliación legalmente reconocido, antes de acudir a la jurisdicción ordinaria. Las partes fijan como domicilio contractual la ciudad de {{jurisdiccion}}, y se someten a los jueces competentes de la República de Colombia.

## Firma electrónica y validez

Las partes reconocen que este documento es un mensaje de datos y acuerdan celebrarlo y firmarlo por medios electrónicos, con la validez y los efectos jurídicos que le atribuyen la Ley 527 de 1999 y el Decreto 2364 de 2012. La firma electrónica de cada parte, su dirección IP, la fecha y hora y la huella digital (hash SHA-256) del contenido quedan registradas como evidencia de su consentimiento y de la integridad del documento. Cada parte declara que los datos que suministra son veraces.

## Disposiciones finales

Este contrato contiene el acuerdo completo de las partes sobre su objeto y reemplaza cualquier negociación anterior. Cualquier modificación debe constar por escrito y estar firmada por ambas partes. Si alguna cláusula resultara inválida, las demás conservarán su validez. Las comunicaciones se harán a los correos electrónicos registrados por cada parte, que se tienen por válidos para todos los efectos.`,
}

import { v } from './vars.ts'
import type { SeedTemplate } from './vars.ts'

export const dataProcessing: SeedTemplate = {
  kind: 'data_processing',
  lang: 'es',
  name: 'Anexo de tratamiento de datos personales',
  variables: [
    v('finalidades', 'Finalidades del tratamiento', 'textarea', {
      required: true,
      default: '- Desarrollar, alojar, probar y mantener los sistemas objeto del contrato.\n- Brindar soporte técnico y corregir incidencias.',
    }),
    v('categorias_datos', 'Categorías de datos y de titulares', 'textarea', {
      required: true,
      default: '- Datos de identificación y contacto de usuarios y clientes del responsable.\n- Datos de uso del sistema (registros y direcciones IP).\n- No se tratarán datos sensibles ni de niños, niñas y adolescentes, salvo pacto expreso.',
    }),
    v('subencargados', 'Subencargados autorizados', 'text', { default: 'ninguno, salvo los proveedores de alojamiento y correo que EL RESPONSABLE haya contratado o autorice por escrito' }),
    v('duracion', 'Duración del tratamiento', 'text', { default: 'la vigencia del contrato principal' }),
    v('plazo_incidentes', 'Plazo para avisar incidentes (horas)', 'number', { default: '48' }),
  ],
  body: `# ANEXO DE TRATAMIENTO DE DATOS PERSONALES

Este anexo hace parte integral del contrato {{contrato_ref}} y se rige por la Ley 1581 de 2012, el Decreto 1377 de 2013 (compilado en el Decreto 1074 de 2015) y demás normas sobre protección de datos personales en Colombia. Se celebra entre {{cliente}} ({{cliente_tipo_doc}} {{cliente_documento}}), en adelante EL RESPONSABLE, y {{prestador}} ({{prestador_tipo_doc}} {{prestador_documento}}), en adelante EL ENCARGADO.

## Roles

EL RESPONSABLE decide sobre la base de datos y el tratamiento de los datos personales. EL ENCARGADO realiza el tratamiento por cuenta de EL RESPONSABLE, únicamente para ejecutar el contrato y siguiendo sus instrucciones documentadas.

## Finalidades

El tratamiento tendrá exclusivamente las siguientes finalidades:

{{finalidades}}

EL ENCARGADO no usará los datos para fines propios ni los cederá a terceros.

## Categorías de datos y titulares

{{categorias_datos}}

## Obligaciones de EL RESPONSABLE

EL RESPONSABLE declara que cuenta con la autorización previa, expresa e informada de los titulares o con otra base legal para el tratamiento y para su transmisión a EL ENCARGADO, que tiene una política de tratamiento de información vigente, y que entregará a EL ENCARGADO solo los datos necesarios y las instrucciones claras sobre su manejo.

## Obligaciones de EL ENCARGADO

EL ENCARGADO se obliga a: tratar los datos conforme a las instrucciones de EL RESPONSABLE y a la ley; conservarlos en condiciones de seguridad para impedir su adulteración, pérdida, consulta, uso o acceso no autorizado o fraudulento; abstenerse de circular información que esté siendo discutida por el titular o bloqueada por una autoridad; dar trámite oportuno a las consultas y los reclamos de los titulares que EL RESPONSABLE le remita; y permitir a EL RESPONSABLE verificar el cumplimiento de este anexo.

## Medidas de seguridad

EL ENCARGADO aplicará medidas técnicas, humanas y administrativas razonables, entre ellas: control de accesos con credenciales personales y mínimo privilegio, uso de conexiones cifradas, copias de seguridad, separación de los entornos de pruebas y producción, y actualización oportuna del software.

## Confidencialidad del personal

EL ENCARGADO garantiza que las personas que accedan a los datos están sometidas a un deber de confidencialidad que subsiste después de terminada su relación con él.

## Subencargados

Los subencargados autorizados son: {{subencargados}}. EL ENCARGADO podrá contratar otros únicamente con autorización previa y escrita de EL RESPONSABLE y les impondrá obligaciones equivalentes a las de este anexo, respondiendo por su cumplimiento.

## Transferencias y transmisiones internacionales

EL ENCARGADO no transmitirá los datos a países que no ofrezcan niveles adecuados de protección según la Superintendencia de Industria y Comercio, salvo que EL RESPONSABLE lo autorice por escrito y se cumplan los requisitos legales. EL RESPONSABLE reconoce que los servicios de nube que él mismo contrate pueden almacenar datos fuera de Colombia bajo su responsabilidad.

## Derechos de los titulares

EL ENCARGADO colaborará con EL RESPONSABLE para atender las solicitudes de acceso, actualización, rectificación, supresión y revocatoria de la autorización de los titulares, y remitirá a EL RESPONSABLE, dentro de los dos (2) días hábiles siguientes, las que reciba directamente.

## Incidentes de seguridad

EL ENCARGADO avisará a EL RESPONSABLE, sin demora injustificada y a más tardar dentro de {{plazo_incidentes}} horas desde que tenga conocimiento, cualquier violación de los códigos de seguridad o riesgo en la administración de los datos, y colaborará en su investigación, mitigación y en el reporte a la Superintendencia de Industria y Comercio cuando corresponda.

## Devolución y supresión

Al terminar el contrato, o cuando EL RESPONSABLE lo solicite, EL ENCARGADO devolverá o suprimirá de forma segura los datos personales y sus copias, y lo certificará por escrito, salvo los que deba conservar por mandato legal.

## Duración

Este anexo rige durante {{duracion}} y las obligaciones de confidencialidad y seguridad subsisten mientras EL ENCARGADO conserve datos personales.

## Firma electrónica

Las partes aceptan firmar este anexo electrónicamente, con los efectos de la Ley 527 de 1999 y el Decreto 2364 de 2012.`,
}

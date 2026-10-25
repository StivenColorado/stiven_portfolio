# Portfolio de Stiven Colorado

Sitio: https://negocioempresarial.online

## Stack

- Frontend: React 19, Vite, Tailwind CSS v4, MobX, react-router, framer-motion, three.
- Backend (`server/`): Node sin framework (`node:http`), SQLite (`node:sqlite`), geolocalización con `mmdb-lib` y base DB-IP City Lite.
- Gestor de paquetes: pnpm.

## Desarrollo

```bash
pnpm install
cp .env.example .env     # completar variables
pnpm dev                 # frontend (Vite, proxy de /api al backend)
pnpm server              # backend en otra terminal
```

Otros scripts: `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test:server`. Migrar imágenes viejas `/projects/` a media: `node --env-file=.env server/scripts/migrate-media.ts [publicDir]`.

## Variables de entorno (`.env`)

| Variable | Valor por defecto | Uso |
|---|---|---|
| `VITE_WEB3FORMS_KEY` | | Access key del formulario de contacto |
| `PORT` / `HOST` | `3001` / `127.0.0.1` | Dirección del backend |
| `DB_PATH` | `server/data/visits.sqlite` | Base SQLite |
| `GEO_DB` | `server/data/dbip-city-lite.mmdb` | Base de geolocalización |
| `ADMIN_PASSWORD_HASH` | | Hash scrypt del admin |
| `TRUST_PROXY` | `0` | `1` para confiar en `X-Real-IP` (solo detrás de nginx) |
| `SESSION_HOURS` | `12` | Duración de la sesión admin |
| `COOKIE_SECURE` | `1` | Usar `0` en desarrollo sobre http |

## Contratos

Módulo del panel (`/admin/contratos`) para expedientes de clientes, plantillas y documentos con firma electrónica. No requiere variables de entorno nuevas: usa `PUBLIC_URL` para los enlaces, `BREVO_API_KEY` para los correos y `MAIL_REPLY_TO` (o `ADMIN_EMAIL`) para la copia firmada del prestador. Sin `BREVO_API_KEY`, en desarrollo el enlace de firma se imprime en la consola del servidor.

Flujo: se crea un expediente, se genera un documento desde una plantilla (8 tipos en español de Colombia, editables; «Restaurar por defecto» recupera la original), se edita el borrador y se envía. El cliente abre `/firmar/<token>` (enlace personal de 32 bytes, solo se guarda su hash; vence a los 30 días por defecto), dibuja su firma y acepta. Si el prestador firmó al enviar, el contrato queda `active` y se genera el PDF definitivo (portada, cláusulas numeradas, firmas, registro de firma con hash SHA-256, fecha, IP y user-agent), que se envía por correo a ambas partes. Si el prestador eligió «firmar después», queda `client_signed` hasta que firme desde el panel. Un trabajo horario (junto con la purga) vence contratos y reenvía hasta 3 recordatorios; cada recordatorio genera un enlace nuevo.

**Datos del cliente.** Al crear un expediente solo se exigen nombre y celular; el correo hace falta al enviar. El tipo y número de documento, la razón social o nombre completo, el representante, la ciudad y la dirección los completa el propio cliente en `/firmar/<token>` antes de firmar (con aviso de tratamiento de datos, Ley 1581 de 2012); el prestador no tiene que pedirlos. Las variables `cliente*` vacías no bloquean el envío ni se listan como faltantes en el panel (las del prestador sí). Al confirmar, el servidor valida el formato (documento alfanumérico de 4 a 30 caracteres, textos sin marcas `[[ ]]`, `{{ }}`, `|`, `<`, `>`), guarda los datos en el expediente solo en los campos que estaban vacíos (el cliente no puede sobrescribir lo que el prestador ya cargó), completa las variables del documento, vuelve a renderizar y registra en la bitácora la acción `client_data` con la IP. El admin puede corregirlos después en el editor del expediente.

Cadena de huellas: al enviar se calcula `H1 = SHA-256(id, versión, tipo, idioma, título, texto con los huecos de datos del cliente aún sin llenar)`; la firma del prestador (si firmó al enviar) lleva `H1`. Si el cliente aporta datos, el texto final cambia y se crea una versión nueva (`versión + 1`, nota «Datos del cliente al firmar») con `H2 = SHA-256(id, versión + 1, tipo, idioma, título, texto final, prev = H1)`. `H2` queda como `content_hash`, es la huella de la firma del cliente, la del PDF y la del correo; `H1` se conserva (`sentHash`) y aparece en la página de evidencia junto con los campos aportados, la fecha y la IP. Si el cliente no cambia el texto (ya estaban todos los datos), no hay versión nueva y `H1` es la única huella. Los documentos enviados o firmados congelan la identidad del cliente (nombre, tipo y número de documento) en el propio documento: editar después el expediente no cambia lo ya enviado ni firmado, solo los borradores y los documentos nuevos. Los documentos firmados antes de esta función no tienen esa copia y siguen leyendo el expediente.

El texto de las plantillas es texto plano con marcado mínimo: `# título`, `## sección` (se numeran solas), `- viñeta`, `| celda | celda |` para tablas (con `|---|` tras el encabezado) y `{{variable}}`. El PDF se genera con [pdfkit](https://pdfkit.org) (`server/pdf.ts`) y fuentes incrustadas (Cormorant Garamond y Nunito, licencia OFL) que viven en `server/assets/fonts/`. **Al desplegar hay que ejecutar la instalación de dependencias en el servidor** (`pnpm install --prod`) para que exista `pdfkit`, y subir esa carpeta de fuentes. La vista previa en vivo del editor usa `POST /api/admin/contracts/preview-pdf` (no guarda nada; las variables sin valor salen resaltadas como `[[clave]]`).

Los correos son React Email: tras cambiar `emails/*.tsx` ejecuta `pnpm email:build` para regenerar `server/mail-templates/`.

**Aviso legal:** las plantillas son modelos generales y no constituyen asesoría legal; revísalas con un abogado antes de usarlas. La firma es electrónica simple (Ley 527 de 1999 y Decreto 2364 de 2012).

## Hash de la contraseña del admin

```bash
pnpm server:hash         # lee la contraseña por stdin e imprime scrypt$<salt>$<hash>
```

Pegar el resultado en `ADMIN_PASSWORD_HASH`.

## Base de geolocalización

```bash
sh server/scripts/get-geodb.sh
```

Descarga DB-IP City Lite (`.mmdb`, ~130 MB) en `server/data/`. Si falta el archivo, el servidor arranca igual sin país ni ciudad. Se actualiza mensualmente (cron opcional con el mismo script).

## Producción (referencia)

Build: `pnpm install --frozen-lockfile && pnpm build`; servir `dist/` con nginx y ejecutar el backend con systemd. Con nginx delante, definir `TRUST_PROXY=1` en `.env`.

nginx:

```nginx
location /api {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
location / {
    try_files $uri /index.html;
}
```

systemd (`/etc/systemd/system/portfolio-api.service`):

```ini
[Unit]
Description=Portfolio API
After=network.target

[Service]
WorkingDirectory=/var/www/portfolio
ExecStart=/usr/bin/node --env-file=.env --disable-warning=ExperimentalWarning server/index.ts
Restart=on-failure
User=www-data

[Install]
WantedBy=multi-user.target
```

## Privacidad

Se registran IP, país y ciudad aproximados, agente de usuario, ruta, referrer y fecha, solo para estadísticas de tráfico y sin terceros. Se respeta `Sec-GPC`/DNT. Las visitas no se purgan solas: el administrador las revisa y las borra a mano. Detalle en la ruta `/privacidad`. Geolocalización: IP Geolocation by DB-IP (CC BY 4.0).

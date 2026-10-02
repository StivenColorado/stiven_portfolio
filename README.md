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

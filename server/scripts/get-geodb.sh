#!/bin/sh
# Descarga DB-IP City Lite (CC BY 4.0); si el mes actual aún no existe (404) usa el anterior.
set -eu
cd "$(dirname "$0")/.."
mkdir -p data
out=data/dbip-city-lite.mmdb
for month in "$(date +%Y-%m)" "$(date -d "$(date +%Y-%m-15) -1 month" +%Y-%m)"; do
  if curl -fsSL "https://download.db-ip.com/free/dbip-city-lite-$month.mmdb.gz" | gunzip > "$out.tmp"; then
    mv "$out.tmp" "$out"
    echo "DB-IP City Lite $month -> server/$out"
    exit 0
  fi
done
rm -f "$out.tmp"
echo "No se pudo descargar la base de geolocalización" >&2
exit 1

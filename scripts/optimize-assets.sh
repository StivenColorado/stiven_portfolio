#!/usr/bin/env bash
# Convierte PNG/JPG/GIF de public/ a WebP (máx. 1600 px) y el mp4 de eyetracking a webm + poster.
# Usa cwebp si existe; si no, el encoder libwebp de ffmpeg. Borra los originales convertidos.
set -euo pipefail
cd "$(dirname "$0")/../public"

to_webp() {
  local src="$1" out="${1%.*}.webp"
  if command -v cwebp >/dev/null; then
    cwebp -quiet -q 78 -resize 1600 0 "$src" -o "$out" 2>/dev/null || cwebp -quiet -q 78 "$src" -o "$out"
  elif command -v ffmpeg >/dev/null; then
    ffmpeg -loglevel error -y -i "$src" -vf "scale='min(1600,iw)':-2" -frames:v 1 -q:v 78 "$out"
  else
    echo "Falta cwebp o ffmpeg: instala uno (p. ej. apt install webp)" >&2
    exit 1
  fi
  rm "$src"
}

while IFS= read -r -d '' f; do to_webp "$f"; done < <(find . -type f \( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' \) ! -name icon.png ! -name pic.jpg -print0)
[ -f pic.jpg ] && [ ! -f pic.webp ] && { cp pic.jpg /tmp/pic.jpg; to_webp pic.jpg; mv /tmp/pic.jpg pic.jpg; }

v=projects/eyetracking/eyetrackingVideo.mp4
if [ -f "$v" ]; then
  ffmpeg -loglevel error -y -i "$v" -vf scale=-2:540,fps=15 -c:v libvpx-vp9 -crf 45 -b:v 0 -deadline good -cpu-used 5 -row-mt 1 -an "${v%.mp4}.webm"
  ffmpeg -loglevel error -y -i "$v" -vf scale=-2:540 -frames:v 1 -q:v 78 "${v%.mp4}.webp"
  rm "$v"
fi

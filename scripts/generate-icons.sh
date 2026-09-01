#!/usr/bin/env bash
# Usage: place source image at public/source-icon.png then run
# chmod +x scripts/generate-icons.sh && ./scripts/generate-icons.sh
set -e
SRC="public/source-icon.png"
OUT_DIR="public"
if [ ! -f "$SRC" ]; then
  echo "Source image not found: $SRC"
  exit 1
fi
echo "Generating icons from $SRC..."
# Require ImageMagick (magick)
magick convert "$SRC" -resize 32x32 "$OUT_DIR/app-icon-32.png"
magick convert "$SRC" -resize 192x192 "$OUT_DIR/app-icon-192.png"
magick convert "$SRC" -resize 512x512 "$OUT_DIR/app-icon-512.png"
magick convert "$SRC" -resize 180x180 "$OUT_DIR/apple-touch-icon.png"
magick convert "$OUT_DIR/app-icon-32.png" -colors 256 "$OUT_DIR/favicon.ico"
echo "Icons written to $OUT_DIR: app-icon-32.png, app-icon-192.png, app-icon-512.png, apple-touch-icon.png, favicon.ico"
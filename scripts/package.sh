#!/usr/bin/env bash
set -euo pipefail

VERSION=$(sed -nE 's/.*"version"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/p' manifest.json | head -1)
OUT="dist/everything-2x-v${VERSION}.zip"

mkdir -p dist
rm -f "${OUT}"

zip -r "${OUT}" . \
  -x "*.git*" \
  -x "*.DS_Store" \
  -x "node_modules/*" \
  -x "dist/*" \
  -x "scripts/*" \
  -x "*.md" \
  -x "LICENSE" \
  -x ".gitignore" \
  -x ".vscode/*" \
  -x ".idea/*"

echo "Created ${OUT}"
unzip -l "${OUT}"

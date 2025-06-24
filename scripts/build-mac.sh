#!/usr/bin/env bash
set -euo pipefail

# ─── Locate project root ───────────────────────────────────────────────────────
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
project_root="$(cd "$script_dir/.." && pwd)"
cd "$project_root"

# ─── Read version (requires jq) ───────────────────────────────────────────────
if ! command -v jq &> /dev/null; then
  echo "🔧 Please install jq: brew install jq"
  exit 1
fi
ver=$(jq -r .version package.json)

# ─── Ensure dist/ ─────────────────────────────────────────────────────────────
dist="$project_root/dist"
mkdir -p "$dist"

# ─── Build universal macOS binary ────────────────────────────────────────────
out="$dist/tenseai-agent-$ver-macos"
echo "⏳ Building macOS universal binary v$ver…"
npx pkg index.js \
  --targets node16-macos-x64,node16-macos-arm64 \
  --output "$out"
echo "✅ Built macOS binary → $out"

# ─── Copy runtime extras ──────────────────────────────────────────────────────
for f in .env .env.example README.md; do
  if [ -f "$f" ]; then
    cp "$f" "$dist/"
    echo "Copied $f → dist/"
  fi
done

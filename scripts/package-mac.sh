#!/usr/bin/env bash
set -euo pipefail

# ─── Locate project root ───────────────────────────────────────────────────────
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
project_root="$(cd "$script_dir/.." && pwd)"
cd "$project_root"

# ─── Read version ─────────────────────────────────────────────────────────────
ver=$(jq -r .version package.json)
dist="$project_root/dist"

# ─── Build + stage extras ────────────────────────────────────────────────────
echo "==> STEP 1: build-mac"
bash scripts/build-mac.sh

# ─── ZIP clean dist/ contents ────────────────────────────────────────────────
zip_name="tenseai-agent-$ver-macos.zip"
echo "==> STEP 2: Zipping dist/ → $zip_name"
cd "$dist"
zip -r "../$zip_name" ./*
cd ..

echo "✅ Created clean ZIP: $zip_name"

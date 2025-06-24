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

# ─── ZIP full project tree ───────────────────────────────────────────────────
full_zip="tenseai-agent-$ver-macos-full.zip"
echo "==> STEP 2: Zipping entire project → dist/$full_zip"
cd "$project_root"
zip -r "$dist/$full_zip" . -x "dist/*" "node_modules/*"  # exclude dist and node_modules if desired
echo "✅ Created full ZIP: $full_zip"

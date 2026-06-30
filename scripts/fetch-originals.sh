#!/usr/bin/env bash
# Download every original sound listed in the live manifest into audio-src/.
# Idempotent: skips files already present.
set -euo pipefail

BASE="https://labotoneradelarania.netlify.app"
SRC="audio-src"
mkdir -p "$SRC"

curl -fsS -o "$SRC/manifest.original.json" "$BASE/manifest.json"
mapfile -t files < <(node -e 'require("./'"$SRC"'/manifest.original.json").forEach(e=>console.log(e.file))')

ok=0; skip=0; fail=0
for f in "${files[@]}"; do
  [ -z "$f" ] && continue
  if [ -f "$SRC/$f" ]; then skip=$((skip + 1)); continue; fi
  if curl -fsS -o "$SRC/$f" "$BASE/sounds/$f"; then ok=$((ok + 1)); else echo "FAIL $f"; fail=$((fail + 1)); fi
done
echo "--- downloaded $ok, skipped $skip (already had), failed $fail of ${#files[@]} ---"

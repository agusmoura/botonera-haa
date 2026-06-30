#!/usr/bin/env bash
# Optimize soundboard audio: trim leading silence, normalize loudness,
# encode to AAC-LC 96k mono (universal decodeAudioData support incl. iOS Safari).
# Usage: ./scripts/optimize-audio.sh [src_dir] [out_dir]
set -euo pipefail

SRC="${1:-audio-src}"
OUT="${2:-public/sounds}"
mkdir -p "$OUT"

shopt -s nullglob nocaseglob
files=("$SRC"/*.{mp3,wav,ogg,m4a,mpeg,aac,flac})
shopt -u nocaseglob

[ ${#files[@]} -eq 0 ] && { echo "no audio in $SRC"; exit 1; }

ok=0; fail=0
for in in "${files[@]}"; do
  name="$(basename "${in%.*}")"
  out="$OUT/$name.m4a"
  if ffmpeg -hide_banner -loglevel error -y -i "$in" -vn \
      -af "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.02,areverse,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05,areverse,loudnorm=I=-16:TP=-1.5:LRA=11" \
      -c:a aac -b:a 96k -ac 1 -ar 48000 -movflags +faststart \
      "$out" 2>/dev/null; then
    printf 'ok   %-40s %s -> %s\n' "$name" "$(du -h "$in" | cut -f1)" "$(du -h "$out" | cut -f1)"
    ok=$((ok+1))
  else
    printf 'FAIL %s\n' "$in"
    fail=$((fail+1))
  fi
done
echo "--- $ok ok, $fail failed | total: $(du -sh "$OUT" | cut -f1) ---"

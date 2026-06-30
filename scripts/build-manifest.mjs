// Regenerate public/manifest.json from the original manifest + the optimized .m4a files.
// - file → .m4a; drops any entry whose .m4a is missing (e.g. the broken .asd sidecar)
// - dedups repeated labels with a numeric suffix ("CORNETA", "CORNETA 2")
// - keeps the original ★ favorites
import fs from "node:fs";

const orig = JSON.parse(fs.readFileSync("audio-src/manifest.original.json", "utf8"));
const seen = new Map();
const out = [];
let dropped = 0;

for (const e of orig) {
  const base = e.file.replace(/\.[^.]+$/, "");
  const file = base + ".m4a";
  if (!fs.existsSync("public/sounds/" + file)) {
    dropped++;
    continue; // non-audio (.asd) or failed conversion
  }
  let label = e.label;
  const n = (seen.get(label) ?? 0) + 1;
  seen.set(label, n);
  if (n > 1) label = `${label} ${n}`;
  out.push({ id: base, label, file, fav: !!e.fav });
}

fs.writeFileSync("public/manifest.json", JSON.stringify(out) + "\n");
console.log(
  `wrote ${out.length} entries (dropped ${dropped}), ${out.filter((x) => x.fav).length} favorites`
);

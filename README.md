# La Botonera

Recreación de [la botonera de la araña](https://labotoneradelarania.netlify.app/) — original de
[@WavJoa](https://x.com/WavJoa) — con un motor de audio en serio: disparo instantáneo, una voz por
sonido, reversa, favoritos reordenables, búsqueda rápida, atajos de teclado y PWA offline.

Sonidos de **Hay Algo Ahí** y la fauna del streaming argentino.

## Stack

Vanilla TS + Vite + Web Audio API. Sin framework. PWA con `vite-plugin-pwa`.

## Desarrollo

```bash
pnpm install
pnpm dev
```

## Build

```bash
pnpm build      # → dist/
pnpm preview
```

## Audio

Los `.m4a` se generan desde los originales (one-shot):

```bash
./scripts/fetch-originals.sh     # baja los originales a audio-src/ (gitignored)
./scripts/optimize-audio.sh      # → public/sounds/*.m4a  (AAC 96k mono, silencio recortado)
node scripts/build-manifest.mjs  # → public/manifest.json (dedup labels + favoritos)
```

## Deploy

Estático, sin SSR — se sirve `dist/` directo.

- **Vercel:** importás el repo (preset Vite: build `pnpm build`, output `dist`). `vercel.json` setea los cache headers.
- **Cloudflare Pages:** build `pnpm build`, output `dist`. `public/_headers` setea el cache.

## Atajos

`espacio` buscar · `Enter` dispara el 1° · `1–9` favoritos · `⇧` + disparo = al revés · `Esc` reset.
Los modificadores (`⇧`) valen también con click y en la búsqueda.

## Créditos / legal

Proyecto de fan, sin fines de lucro. Inspirada en la botonera de la araña ([@WavJoa](https://x.com/WavJoa)).
Los sonidos son de sus dueños. Si sos dueño de un audio y querés que se baje, abrí un issue y se va.

© 2026 CaleGroup S.A — en joda. Combatí la licuadora → [HAGOV](https://hagov.ar/).

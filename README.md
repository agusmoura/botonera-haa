# La Botonera 🕷️

Recreación de [la botonera de la araña](https://labotoneradelarania.netlify.app/) — original de
[@WavJoa](https://x.com/WavJoa) — con un motor de audio en serio: disparo instantáneo, una voz por
sonido, reversa, favoritos reordenables, búsqueda rápida, atajos de teclado y PWA offline.

**En vivo → https://labotonerahaa.vercel.app/**

Sonidos de **Hay Algo Ahí** y la fauna del streaming argentino.

## Stack

Vanilla TS + Vite + Web Audio API. Sin framework. PWA con `vite-plugin-pwa`.

## Requisitos

- Node ≥ 20
- pnpm ≥ 9 (`corepack enable`)

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

## Estructura

```
src/
  engine.ts    motor Web Audio (play, stop, reversa, recovery mobile)
  main.ts      orquestación: grilla, favoritos, búsqueda, teclado, ajustes
  state.ts     favoritos + ajustes (localStorage)
  sortable.ts  reorder pointer-based (favoritos)
  styles.css   dark #0E0E10 + amarillo #F4D03F
scripts/       pipeline de audio + manifest
public/        sounds/, iconos, manifest, og
```

## Audio

Los `.m4a` ya están versionados en `public/sounds/`. Para regenerarlos desde los originales (one-shot):

```bash
./scripts/fetch-originals.sh     # baja los originales a audio-src/ (gitignored)
./scripts/optimize-audio.sh      # → public/sounds/*.m4a  (AAC 96k mono, silencio recortado)
node scripts/build-manifest.mjs  # → public/manifest.json (dedup labels + favoritos)
```

## Atajos

`espacio` buscar · `Enter` dispara el 1° · `1–9` favoritos · `⇧` + disparo = al revés · `Esc` reset.
Los modificadores (`⇧`) valen también con click y en la búsqueda.

## Deploy

Estático, sin SSR — se sirve `dist/` directo.

- **Vercel:** importás el repo (preset Vite: build `pnpm build`, output `dist`). `vercel.json` setea los cache headers.
- **Cloudflare Pages:** build `pnpm build`, output `dist`. `public/_headers` setea el cache.

> El `og:image` y las URLs de Twitter están hardcodeadas a `labotonerahaa.vercel.app` en `index.html`.
> Si cambiás de dominio, actualizá esos meta tags.

## Contribuir

Bienvenidas las PRs — mirá [CONTRIBUTING.md](CONTRIBUTING.md). Regla base: `pnpm exec tsc --noEmit` en
verde y [commits convencionales](https://www.conventionalcommits.org/).

## Créditos y legal

Proyecto de fan, sin fines de lucro. Inspirada en la botonera de la araña
([@WavJoa](https://x.com/WavJoa)). Sonidos de sus dueños.

**Los audios son de terceros y NO están cubiertos por la licencia.** Si sos dueño de un audio y querés
que se baje, abrí un issue y se va.

El código está bajo licencia [MIT](LICENSE). © 2026 Agustín Mouriño.

_(Lo de "© CaleGroup S.A" dentro de la app es joda. Combatí la licuadora → [HAGOV](https://hagov.ar/).)_

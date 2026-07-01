# Contribuir

Gracias por querer sumar. Es un proyecto de fan, chico y sin humo — se mantiene simple a propósito.

## Setup

```bash
pnpm install
pnpm dev
```

Requiere Node ≥ 20 y pnpm ≥ 9 (`corepack enable`).

## Antes de abrir una PR

- `pnpm exec tsc --noEmit` en verde (no rompas los tipos).
- `pnpm build` buildea sin errores.
- Probalo en mobile (390px) — es mobile-first.
- Mantené el estilo existente: Vanilla TS, sin sumar dependencias salvo que haga falta de verdad.

## Commits

[Conventional commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `chore:`, `docs:`, etc. Sin `Co-Authored-By`.

## PRs

1. Forkeá y branch desde `main` (`feat/lo-que-sea`).
2. Cambios chicos y enfocados. Una cosa por PR.
3. Describí qué cambia y por qué. Si es visual, sumá screenshot.

## Sonidos

- El pipeline de audio vive en `scripts/` (`fetch-originals` → `optimize-audio` → `build-manifest`). Los `.m4a` son AAC 96k mono.
- **No subas audio del que no tengas derechos.** Los sonidos actuales son de terceros (homenaje / parodia) y están sujetos a takedown.

## ¿Sos dueño de un audio y lo querés fuera?

Abrí un issue con el nombre del archivo y se baja. Sin vueltas.

## Ideas y bugs

Abrí un issue. Para features grandes, charlémoslo en un issue antes de codear — así no laburás al pedo.

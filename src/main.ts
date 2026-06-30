import "./styles.css";
import {
  play,
  stopAll,
  unlock,
  warmup,
  prefetch,
  setVolume,
  setTriggerMode,
  setPlaybackListener,
} from "./engine";
import * as state from "./state";
import { enableSortable } from "./sortable";

type Sound = { id: string; label: string; file: string; fav?: boolean };

const app = document.querySelector<HTMLElement>("#app")!;
const grid = document.querySelector<HTMLElement>("#grid")!;
const favsSection = document.querySelector<HTMLElement>("#favorites")!;
const favsGrid = document.querySelector<HTMLElement>("#favs-grid")!;
const search = document.querySelector<HTMLInputElement>("#search")!;
const stopBtn = document.querySelector<HTMLButtonElement>("#stop")!;
const stopFab = document.querySelector<HTMLButtonElement>("#stop-fab")!;
const editBtn = document.querySelector<HTMLButtonElement>("#edit")!;
const settingsBtn = document.querySelector<HTMLButtonElement>("#settings-btn")!;
const dialog = document.querySelector<HTMLDialogElement>("#settings")!;
const infoDialog = document.querySelector<HTMLDialogElement>("#info")!;
const infoBtn = document.querySelector<HTMLButtonElement>("#info-btn")!;
const infoLink = document.querySelector<HTMLButtonElement>("#info-link")!;
const count = document.querySelector<HTMLElement>("#count")!;
const volEl = document.querySelector<HTMLInputElement>("#set-volume")!;
const modeEl = document.querySelector<HTMLSelectElement>("#set-mode")!;
const densityEl = document.querySelector<HTMLSelectElement>("#set-density")!;
const motionEl = document.querySelector<HTMLInputElement>("#set-motion")!;

let sounds: Sound[] = [];
const byFile = new Map<string, Sound>();
let query = "";
let editing = false;
let disposeSortable: (() => void) | null = null;

// ---------- boot ----------
async function boot() {
  sounds = await fetch("manifest.json").then((r) => r.json());
  sounds.forEach((s) => byFile.set(s.file, s));
  count.textContent = `${sounds.length} sonidos`;

  // first visit → seed favorites with the manifest's ★ set (keys 1-9 = first 9 of them)
  if (state.isPristine()) {
    state.reorderFavorites(sounds.filter((s) => s.fav).map((s) => s.file));
  }

  setPlaybackListener({ onStart: fillStart, onEnd: fillClear });
  applySettings();
  render();
  const favFiles = new Set(state.getFavorites());
  void warmup([...favFiles]); // decode favorites → instant 1-9
  prefetch(sounds.map((s) => s.file).filter((f) => !favFiles.has(f))); // warm the rest in idle

  // show the info modal once per browser session (recalcar la firma + el contexto)
  if (!sessionStorage.getItem("botonera:info-seen")) {
    sessionStorage.setItem("botonera:info-seen", "1");
    infoDialog.showModal();
  }
}

// ---------- rendering ----------
function makePad(
  s: Sound,
  opts: { index?: number; fav: boolean; star: boolean; remove: boolean }
): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.className = "pad";
  btn.type = "button";
  btn.dataset.file = s.file;

  const fill = document.createElement("span");
  fill.className = "pad__fill";
  btn.appendChild(fill);

  const rev = document.createElement("span");
  rev.className = "pad__rev";
  rev.textContent = "REV";
  btn.appendChild(rev);

  if (opts.index !== undefined && opts.index < 9) {
    const idx = document.createElement("span");
    idx.className = "pad__idx";
    idx.textContent = String(opts.index + 1);
    btn.appendChild(idx);
  }

  if (opts.star) {
    const star = document.createElement("span");
    star.className = "pad__star" + (opts.fav ? " is-fav" : "");
    star.textContent = opts.fav ? "★" : "☆";
    star.dataset.star = s.file;
    btn.appendChild(star);
  }

  if (opts.remove) {
    const rm = document.createElement("span");
    rm.className = "pad__remove";
    rm.textContent = "✕";
    rm.dataset.remove = s.file;
    btn.appendChild(rm);
  }

  const label = document.createElement("span");
  label.className = "pad__label";
  label.textContent = s.label;
  btn.appendChild(label);

  return btn;
}

// Browse mode (no query): grid = non-favorited sounds (favorites have their own section).
// Search mode (query set): grid = ALL matching sounds, favorites included, in manifest order.
function gridSounds(): Sound[] {
  if (query) return sounds.filter((s) => s.label.toLowerCase().includes(query));
  const favs = new Set(state.getFavorites());
  return sounds.filter((s) => !favs.has(s.file));
}

function renderGrid() {
  const favs = new Set(state.getFavorites());
  const frag = document.createDocumentFragment();
  gridSounds().forEach((s) =>
    frag.appendChild(makePad(s, { fav: favs.has(s.file), star: true, remove: false }))
  );
  grid.replaceChildren(frag);
}

function renderFavorites() {
  const favs = state.getFavorites();
  favsSection.hidden = favs.length === 0;
  const frag = document.createDocumentFragment();
  favs.forEach((file, i) => {
    const s = byFile.get(file);
    if (!s) return; // a favorited file not in the current manifest — skip
    frag.appendChild(makePad(s, { index: i, fav: true, star: !editing, remove: editing }));
  });
  favsGrid.replaceChildren(frag);
  favsGrid.classList.toggle("is-editing", editing);
}

function render() {
  renderFavorites(); // favorites stay visible at all times (also during search)
  renderGrid();
}

// ---------- playback + visual ----------
function bounce(pad: HTMLElement) {
  if (state.getSettings().reduceMotion) return;
  pad.classList.remove("pad--hit");
  void pad.offsetWidth; // reflow so the animation restarts on rapid taps
  pad.classList.add("pad--hit");
}

function trigger(pad: HTMLElement, reverse = false) {
  const file = pad.dataset.file;
  if (!file) return;
  void play(file, { reverse });
  bounce(pad);
}

function playFile(file: string, reverse = false) {
  void play(file, { reverse });
  const pad = grid.querySelector<HTMLElement>(`.pad[data-file="${file}"]`);
  if (pad) bounce(pad);
}

function padsFor(file: string): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>(`.pad[data-file="${file}"]`)];
}

function fillStart(file: string, dur: number, reverse: boolean) {
  if (state.getSettings().reduceMotion) return;
  padsFor(file).forEach((pad) => {
    const fill = pad.querySelector<HTMLElement>(".pad__fill");
    if (!fill) return;
    fill.style.transformOrigin = reverse ? "right" : "left"; // mirror the fill for reversed audio
    fill.style.transition = "none";
    fill.style.transform = "scaleX(0)";
    void fill.offsetWidth; // commit the reset before animating
    fill.style.transition = `transform ${dur}s linear`;
    fill.style.transform = "scaleX(1)";
  });
}

function fillClear(file: string) {
  padsFor(file).forEach((pad) => {
    const fill = pad.querySelector<HTMLElement>(".pad__fill");
    if (!fill) return;
    fill.style.transition = "transform 0.14s ease-out";
    fill.style.transform = "scaleX(0)";
  });
}

// ---------- pad interaction ----------
function onPadPointerDown(e: PointerEvent) {
  const target = e.target as HTMLElement;

  const star = target.closest<HTMLElement>(".pad__star");
  if (star) {
    e.preventDefault();
    state.toggleFavorite(star.dataset.star!);
    render();
    return;
  }

  const rm = target.closest<HTMLElement>(".pad__remove");
  if (rm) {
    e.preventDefault();
    state.toggleFavorite(rm.dataset.remove!); // already a favorite → toggles off
    render();
    return;
  }

  const pad = target.closest<HTMLElement>(".pad");
  if (!pad) return;

  // in edit mode, favorite pads are drag handles — let sortable take over
  if (editing && favsGrid.contains(pad)) return;

  e.preventDefault();
  // right third = reverse on touch (mobile only); desktop reverses with Shift
  const rect = pad.getBoundingClientRect();
  const revZone =
    window.matchMedia("(max-width: 679px)").matches &&
    e.clientX - rect.left > rect.width * 0.667;
  trigger(pad, e.shiftKey || revZone);
}

grid.addEventListener("pointerdown", onPadPointerDown);
favsGrid.addEventListener("pointerdown", onPadPointerDown);

// ---------- edit mode ----------
function setEditing(on: boolean) {
  editing = on;
  editBtn.classList.toggle("is-active", on);
  editBtn.textContent = on ? "Listo" : "Editar";
  renderFavorites();
  disposeSortable?.();
  disposeSortable = null;
  if (on) {
    disposeSortable = enableSortable(favsGrid, {
      itemSelector: ".pad",
      idAttr: "file",
      ignore: ".pad__remove, .pad__star",
      onReorder: (ids) => {
        state.reorderFavorites(ids);
        renderFavorites();
      },
    });
  }
}

editBtn.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  setEditing(!editing);
});

// ---------- settings ----------
function applySettings() {
  const s = state.getSettings();
  setVolume(s.volume);
  setTriggerMode(s.triggerMode);
  app.dataset.density = s.density;
  app.classList.toggle("reduce-motion", s.reduceMotion);
  volEl.value = String(Math.round(s.volume * 100));
  modeEl.value = s.triggerMode;
  densityEl.value = s.density;
  motionEl.checked = s.reduceMotion;
}

settingsBtn.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  dialog.showModal();
});

const openInfo = (e: Event) => {
  e.preventDefault();
  infoDialog.showModal();
};
infoBtn.addEventListener("pointerdown", openInfo);
infoLink.addEventListener("pointerdown", openInfo);
volEl.addEventListener("input", () => {
  state.setSetting("volume", Number(volEl.value) / 100);
  applySettings();
});
modeEl.addEventListener("change", () => {
  state.setSetting("triggerMode", modeEl.value as state.TriggerMode);
  applySettings();
});
densityEl.addEventListener("change", () => {
  state.setSetting("density", densityEl.value as state.Density);
  applySettings();
});
motionEl.addEventListener("change", () => {
  state.setSetting("reduceMotion", motionEl.checked);
  applySettings();
});

// ---------- search ----------
search.addEventListener("input", () => {
  query = search.value.trim().toLowerCase();
  render();
});

function clearSearch() {
  if (!query && !search.value) return;
  search.value = "";
  query = "";
  render();
}

stopBtn.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  stopAll();
});
stopFab.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  stopAll();
});

// ---------- keyboard ----------
window.addEventListener("keydown", (e) => {
  const typing = document.activeElement === search;

  // Space focuses the search box (not while typing or inside the settings dialog).
  if (e.key === " " && !typing && !dialog.open && !infoDialog.open) {
    e.preventDefault();
    search.focus();
    search.select();
    return;
  }

  // Escape: undo the search and restore everything (and stop any sound).
  if (e.key === "Escape") {
    if (dialog.open || infoDialog.open) return; // a <dialog> closes itself on Esc
    if (editing) {
      setEditing(false);
      return;
    }
    stopAll();
    clearSearch();
    search.blur();
    return;
  }

  // Enter inside the search box plays the first result.
  if (e.key === "Enter" && typing) {
    e.preventDefault();
    const first = gridSounds()[0];
    if (first) playFile(first.file, e.shiftKey); // Shift+Enter → first result reversed
    return;
  }

  // 1-9 fire favorites by position; Shift = play reversed. Matched via e.code so it works
  // with Shift held (Shift+1 is "!" in e.key) and digits/symbols never reach the search box.
  const numKey = /^(?:Digit|Numpad)([0-9])$/.exec(e.code);
  if (numKey) {
    if (typing) e.preventDefault();
    const n = Number(numKey[1]);
    if (n >= 1) {
      const idx = n - 1;
      const favs = state.getFavorites();
      if (idx < favs.length) {
        e.preventDefault();
        void play(favs[idx], { reverse: e.shiftKey });
        const pad = favsGrid.children[idx] as HTMLElement | undefined;
        if (pad) bounce(pad);
      }
    }
    return;
  }

  if (typing) return; // let the user type freely in the search box

  const focused = document.activeElement as HTMLElement | null;
  if (focused?.classList.contains("pad") && e.key === "Enter") {
    e.preventDefault();
    if (!(editing && favsGrid.contains(focused))) trigger(focused, e.shiftKey);
    return;
  }
});

// First interaction anywhere unlocks audio output on iOS.
window.addEventListener("pointerdown", unlock, { once: true });

// SEO: canonical + JSON-LD injected at runtime (Vite errors on a static <link rel=canonical href="/">).
{
  const canonical = document.createElement("link");
  canonical.rel = "canonical";
  canonical.href = location.origin + "/";
  document.head.appendChild(canonical);

  const ld = document.createElement("script");
  ld.type = "application/ld+json";
  ld.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "La Botonera de la Araña",
    description:
      "Botonera de sonidos de Hay Algo Ahí y el streaming argentino. Disparo instantáneo, reversa, favoritos y modo offline.",
    applicationCategory: "EntertainmentApplication",
    operatingSystem: "Any",
    inLanguage: "es-AR",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "ARS" },
  });
  document.head.appendChild(ld);
}

boot();

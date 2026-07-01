import "./styles.css";
import {
  play,
  stopAll,
  cancelVoice,
  unlock,
  warmup,
  prefetch,
  setVolume,
  setTriggerMode,
  setPlaybackListener,
} from "./engine";
import * as state from "./state";
import { enableSortable } from "./sortable";

declare global {
  interface Window {
    umami?: { track: (event: string, data?: Record<string, unknown>) => void };
  }
}

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
const shareDialog = document.querySelector<HTMLDialogElement>("#share")!;
const shareTitle = document.querySelector<HTMLElement>("#share-title")!;
const shareBtn = document.querySelector<HTMLButtonElement>("#share-btn")!;
const dlLink = document.querySelector<HTMLAnchorElement>("#dl")!;
const dlBtn = document.querySelector<HTMLButtonElement>("#downloads-btn")!;
const dlDialog = document.querySelector<HTMLDialogElement>("#downloads")!;
const dlSearch = document.querySelector<HTMLInputElement>("#dl-search")!;
const dlList = document.querySelector<HTMLElement>("#dl-list")!;
const count = document.querySelector<HTMLElement>("#count")!;
const volEl = document.querySelector<HTMLInputElement>("#set-volume")!;
const modeEl = document.querySelector<HTMLSelectElement>("#set-mode")!;
const densityEl = document.querySelector<HTMLSelectElement>("#set-density")!;
const motionEl = document.querySelector<HTMLInputElement>("#set-motion")!;
const revEl = document.querySelector<HTMLInputElement>("#set-rev")!;

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
    const defaultFavs = [
      "sape.m4a",
      "buenas.m4a",
      "disparo.m4a",
      "drums_1.m4a",
      "juli_estoy_trabado_en_el_trafico.m4a",
      "spiderman.m4a",
      "se_llama_manu_jove.m4a",
      "japanese_style_sound_effect.m4a",
      "cucarajas.m4a",
      "corneta.m4a",
    ].filter((f) => byFile.has(f));
    state.reorderFavorites(defaultFavs);
  }

  setPlaybackListener({ onStart: onPlayStart, onEnd: fillClear });
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
  // the download-modal rows carry a .pad__fill too → the progress fill plays on them as well
  return [
    ...document.querySelectorAll<HTMLElement>(
      `.pad[data-file="${file}"], .dl-row__play[data-file="${file}"]`
    ),
  ];
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

// every play (click, keyboard, reverse) → fill + analytics count.
// umami loads only on the deployed site, so window.umami is undefined on localhost → guarded.
function onPlayStart(file: string, dur: number, reverse: boolean) {
  fillStart(file, dur, reverse);
  window.umami?.track("play", { sound: byFile.get(file)?.label ?? file });
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
    state.getSettings().touchReverse &&
    e.clientX - rect.left > rect.width * 0.667;
  trigger(pad, e.shiftKey || revZone);
  if (e.pointerType !== "mouse") armScrollGuard(pad.dataset.file!, e); // cancel if it turns into a scroll
}

grid.addEventListener("pointerdown", onPadPointerDown);
favsGrid.addEventListener("pointerdown", onPadPointerDown);

// cancel a just-triggered sound if the touch turns into a scroll (moved >10px, or the browser
// takes the gesture) — keeps instant play on real taps, kills accidental scroll-triggers.
let sgFile: string | null = null;
let sgX = 0;
let sgY = 0;

function endScrollGuard() {
  sgFile = null;
  document.removeEventListener("pointermove", onScrollGuardMove);
  document.removeEventListener("pointerup", endScrollGuard);
  document.removeEventListener("pointercancel", onScrollGuardCancel);
}

function onScrollGuardMove(e: PointerEvent) {
  if (sgFile && Math.hypot(e.clientX - sgX, e.clientY - sgY) > 10) {
    cancelVoice(sgFile);
    endScrollGuard();
  }
}

function onScrollGuardCancel() {
  if (sgFile) cancelVoice(sgFile);
  endScrollGuard();
}

function armScrollGuard(file: string, e: PointerEvent) {
  endScrollGuard();
  sgFile = file;
  sgX = e.clientX;
  sgY = e.clientY;
  document.addEventListener("pointermove", onScrollGuardMove);
  document.addEventListener("pointerup", endScrollGuard);
  document.addEventListener("pointercancel", onScrollGuardCancel);
}

// ---------- download / share a sound ----------
// header button → #downloads modal (search + list) → pick a sound → #share sheet (this).
let shareFile: File | null = null;
let shareLabel = "";

function openShareSheet(file: string) {
  const s = byFile.get(file);
  if (!s) return;
  shareLabel = s.label;
  shareTitle.textContent = s.label;
  dlLink.href = "sounds/" + file;
  dlLink.download = s.label + ".m4a";
  shareFile = null;
  shareBtn.hidden = true;
  // prepare the File up front so share() in the button click keeps its user activation (iOS Safari)
  fetch("sounds/" + file)
    .then((r) => r.blob())
    .then((b) => {
      const f = new File([b], s.label + ".m4a", { type: "audio/mp4" });
      if (navigator.canShare?.({ files: [f] })) {
        shareFile = f;
        shareBtn.hidden = false;
      }
    })
    .catch(() => {});
  shareDialog.showModal();
}

function saveBlob(b: Blob, name: string) {
  const url = URL.createObjectURL(b);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

shareBtn.addEventListener("click", () => {
  if (!shareFile || !navigator.canShare?.({ files: [shareFile] })) return;
  void navigator.share({ files: [shareFile], title: shareLabel }).catch(() => {});
  window.umami?.track("share", { sound: shareLabel });
});

// fetch→blob→objectURL: reliable save on iOS Safari (a static <a download> may open a preview)
dlLink.addEventListener("click", (e) => {
  e.preventDefault();
  const name = dlLink.download;
  if (shareFile) saveBlob(shareFile, name);
  else
    fetch(dlLink.href)
      .then((r) => r.blob())
      .then((b) => saveBlob(b, name))
      .catch(() => {});
  window.umami?.track("download", { sound: shareLabel });
});

// downloads modal: searchable list. each row = [⬇ get] + [label = tap to preview-play].
function renderDownloadList(q = "") {
  const query = q.trim().toLowerCase();
  const list = query ? sounds.filter((s) => s.label.toLowerCase().includes(query)) : sounds;
  dlList.replaceChildren(
    ...list.map((s) => {
      const row = document.createElement("div");
      row.className = "dl-row";
      const getBtn = document.createElement("button");
      getBtn.type = "button";
      getBtn.className = "dl-row__get";
      getBtn.dataset.file = s.file;
      getBtn.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/></svg>';
      getBtn.title = "Descargar / compartir";
      getBtn.setAttribute("aria-label", "Descargar " + s.label);
      const playBtn = document.createElement("button");
      playBtn.type = "button";
      playBtn.className = "dl-row__play";
      playBtn.dataset.file = s.file;
      const fill = document.createElement("span");
      fill.className = "pad__fill";
      const lbl = document.createElement("span");
      lbl.className = "dl-row__label";
      lbl.textContent = s.label;
      playBtn.append(fill, lbl);
      row.append(playBtn, getBtn);
      return row;
    })
  );
}

dlBtn.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  dlSearch.value = "";
  renderDownloadList();
  dlDialog.showModal();
  dlSearch.focus(); // auto-focus → opens the on-screen keyboard on mobile
  window.umami?.track("downloads-open");
});
dlSearch.addEventListener("input", () => renderDownloadList(dlSearch.value));
dlList.addEventListener("click", (e) => {
  const target = e.target as HTMLElement;
  const getBtn = target.closest<HTMLElement>(".dl-row__get");
  if (getBtn) {
    const file = getBtn.dataset.file!;
    window.umami?.track("download", { sound: byFile.get(file)?.label ?? file });
    openShareSheet(file);
    return;
  }
  const playBtn = target.closest<HTMLElement>(".dl-row__play");
  if (playBtn) void play(playBtn.dataset.file!); // preview so you know which one it is
});

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
  app.classList.toggle("no-touch-rev", !s.touchReverse);
  volEl.value = String(Math.round(s.volume * 100));
  modeEl.value = s.triggerMode;
  densityEl.value = s.density;
  motionEl.checked = s.reduceMotion;
  revEl.checked = s.touchReverse;
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
revEl.addEventListener("change", () => {
  state.setSetting("touchReverse", revEl.checked);
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

// analytics (Umami) — load only on the deployed site, never on localhost/preview/tests
{
  const h = location.hostname;
  const isLocal =
    !h || h === "localhost" || h === "127.0.0.1" || h === "0.0.0.0" || h.endsWith(".local");
  if (!isLocal) {
    const a = document.createElement("script");
    a.defer = true;
    a.src = "https://analytics.moura.ar/stats.js";
    a.dataset.websiteId = "a9f744b1-6c76-40ac-bb40-b72141d9c7b6";
    a.dataset.performance = "true"; // Core Web Vitals (LCP/INP/CLS/FCP/TTFB) — Umami >= v3.1.0
    document.head.appendChild(a);
  }
}

boot();

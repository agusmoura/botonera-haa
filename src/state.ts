// Persisted app state: favorites (ordered) + settings. One localStorage key.

export type TriggerMode = "poly" | "mono";
export type Density = "comfortable" | "compact";

export type Settings = {
  volume: number; // 0..1
  triggerMode: TriggerMode;
  density: Density;
  reduceMotion: boolean;
};

export type State = {
  favorites: string[]; // file ids, in manual order
  settings: Settings;
};

const KEY = "botonera:v1";

const DEFAULTS: State = {
  favorites: [],
  settings: {
    volume: 1,
    triggerMode: "poly",
    density: "comfortable",
    reduceMotion: false,
  },
};

const stored = localStorage.getItem(KEY);
const pristine = stored === null;

function load(): State {
  try {
    if (stored === null) return structuredClone(DEFAULTS);
    const parsed = JSON.parse(stored) as Partial<State>;
    return {
      favorites: Array.isArray(parsed.favorites) ? parsed.favorites : [],
      settings: { ...DEFAULTS.settings, ...(parsed.settings ?? {}) },
    };
  } catch {
    return structuredClone(DEFAULTS);
  }
}

const state: State = load();

// True only on the very first visit (no stored key yet) — used to seed defaults once.
export function isPristine(): boolean {
  return pristine;
}

function persist(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* quota exceeded / private mode — keep running, just don't persist */
  }
}

// ---- favorites ----
export function getFavorites(): string[] {
  return state.favorites;
}

export function isFavorite(file: string): boolean {
  return state.favorites.includes(file);
}

export function toggleFavorite(file: string): void {
  const i = state.favorites.indexOf(file);
  if (i === -1) state.favorites.push(file);
  else state.favorites.splice(i, 1);
  persist();
}

export function reorderFavorites(order: string[]): void {
  state.favorites = order;
  persist();
}

// ---- settings ----
export function getSettings(): Settings {
  return state.settings;
}

export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]): void {
  state.settings[key] = value;
  persist();
}

const KEY = 'cylinder-protection-save-v1';

export interface SaveData {
  stars: number[];       // best stars per level (0 = not beaten)
  seenEnemies: string[]; // enemy types the player has been introduced to
  muted: boolean;
}

function fresh(): SaveData {
  return { stars: [], seenEnemies: [], muted: false };
}

let cache: SaveData | null = null;

export function load(): SaveData {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    cache = raw ? { ...fresh(), ...JSON.parse(raw) } : fresh();
  } catch {
    cache = fresh();
  }
  return cache!;
}

export function save(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(load()));
  } catch {
    /* storage unavailable */
  }
}

export function recordStars(level: number, stars: number): void {
  const d = load();
  d.stars[level] = Math.max(d.stars[level] ?? 0, stars);
  save();
}

export function isUnlocked(level: number): boolean {
  if (level === 0) return true;
  return (load().stars[level - 1] ?? 0) > 0;
}

export function totalStars(): number {
  return load().stars.reduce((a, b) => a + (b ?? 0), 0);
}

export function resetProgress(): void {
  const muted = load().muted;
  cache = { ...fresh(), muted };
  save();
}

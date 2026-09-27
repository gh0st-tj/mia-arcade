/**
 * Level progress for the Bluey games, saved in this browser only.
 * Each game stores the best star count (1–3) for every finished level.
 */
export type BlueyGame = 'treats' | 'keepy';
const KEY = 'mia-bluey-v1';
type Saved = Partial<Record<BlueyGame, number[]>>;

function read(): Saved {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || '{}');
    return value && typeof value === 'object' ? value : {};
  } catch {
    return {};
  }
}
/** Best stars per level; 0 means not finished yet. */
export function loadLevels(game: BlueyGame, count: number): number[] {
  const saved = read()[game];
  return Array.from({ length: count }, (_, i) => {
    const n = Array.isArray(saved) ? Number(saved[i]) : 0;
    return Number.isFinite(n) ? Math.max(0, Math.min(3, Math.floor(n))) : 0;
  });
}
export function saveLevels(game: BlueyGame, levels: number[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...read(), [game]: levels }));
  } catch {}
}
/** Keep the better result when a level is replayed. */
export const recordLevel = (levels: number[], index: number, stars: number) =>
  levels.map((best, i) => (i === index ? Math.max(best, stars, 1) : best));
/** One arcade star for every finished world of `perWorld` levels. */
export const arcadeStars = (levels: number[], perWorld: number) => {
  let worlds = 0;
  for (let w = 0; w * perWorld < levels.length; w++)
    if (levels.slice(w * perWorld, (w + 1) * perWorld).every((n) => n > 0))
      worlds++;
  return Math.min(3, worlds);
};

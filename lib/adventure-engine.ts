import type { Level } from './game-engine';
export type AdventureId = 'trail' | 'market' | 'robot';
type Random = () => number;
function shuffled<T>(items: T[], random: Random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
export const neighbors = (cell: number, size: number) =>
  [
    cell - size,
    cell + size,
    ...(cell % size > 0 ? [cell - 1] : []),
    ...(cell % size < size - 1 ? [cell + 1] : []),
  ].filter((n) => n >= 0 && n < size * size);
export function makeTrail(
  level: Level,
  round = 0,
  random: Random = Math.random,
) {
  const size = level === 2 ? 5 : 4;
  // Reserve a winding but short route before adding rocks, so every map is solvable.
  const route = [0];
  let row = 0,
    col = 0;
  while (row < size - 1 || col < size - 1) {
    if (col === size - 1 || (row < size - 1 && random() < 0.5)) row++;
    else col++;
    route.push(row * size + col);
  }
  const open = new Set(route);
  const candidates = shuffled(
    Array.from({ length: size * size }, (_, i) => i).filter(
      (i) => !open.has(i),
    ),
    random,
  );
  const rocks = candidates.slice(
    0,
    Math.min(candidates.length, 3 + level + Math.min(round, 2)),
  );
  const treats = [route[Math.floor(route.length / 2)]];
  return { size, start: 0, goal: size * size - 1, rocks, treats };
}
export const groceries = [
  { emoji: '🍎', en: 'apples', he: 'תפוחים', enOne: 'apple', heOne: 'תפוח' },
  { emoji: '🥕', en: 'carrots', he: 'גזרים', enOne: 'carrot', heOne: 'גזר' },
  { emoji: '🍌', en: 'bananas', he: 'בננות', enOne: 'banana', heOne: 'בננה' },
  {
    emoji: '🍓',
    en: 'strawberries',
    he: 'תותים',
    enOne: 'strawberry',
    heOne: 'תות',
  },
] as const;
export function makeMarket(
  level: Level,
  round = 0,
  random: Random = Math.random,
) {
  const ids = shuffled([0, 1, 2, 3], random).slice(0, level === 0 ? 2 : 3);
  const max = level === 2 ? 3 : 2;
  return groceries.map((_, i) =>
    ids.includes(i)
      ? 1 + Math.floor(random() * (round === 0 && level === 0 ? 1 : max))
      : 0,
  );
}
export const robotColors = [
  { color: '#ff9dba', en: 'Pink', he: 'ורוד', symbol: '♥' },
  { color: '#ffd771', en: 'Yellow', he: 'צהוב', symbol: '★' },
  { color: '#7ecfff', en: 'Blue', he: 'כחול', symbol: '●' },
  { color: '#84ddc0', en: 'Green', he: 'ירוק', symbol: '▲' },
] as const;
export const robotParts = [
  { id: 'head', en: 'head', he: 'ראש' },
  { id: 'body', en: 'body', he: 'גוף' },
  { id: 'left', en: 'left arm', he: 'זרוע שמאל' },
  { id: 'right', en: 'right arm', he: 'זרוע ימין' },
  { id: 'feet', en: 'feet', he: 'רגליים' },
] as const;
export function makeRobot(level: Level, random: Random = Math.random) {
  const palette = shuffled([0, 1, 2, 3], random).slice(0, level === 0 ? 3 : 4);
  return shuffled(
    Array.from({ length: 5 }, (_, i) => palette[i % palette.length]),
    random,
  );
}

import type { GameId, Lang } from './game-data';
export type Random = () => number;
/** Difficulty tier: 0 = first star, 1 = second star, 2 = third star. */
export type Level = 0 | 1 | 2;
export const levelFor = (stars: number | undefined): Level =>
  Math.max(0, Math.min(2, Math.floor(stars || 0))) as Level;
export const shuffle = <T>(items: T[], random: Random = Math.random): T[] => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};
const randInt = (lo: number, hi: number, random: Random) =>
  lo + Math.floor(random() * (hi - lo + 1));
const pick = <T>(items: T[], random: Random) =>
  items[Math.floor(random() * items.length)];
/** Colors come in look-alike pairs (index ^ 1) so later levels can be tricky. */
export const colors = [
  { value: '#f37eae', en: 'Pink', he: 'ורוד' },
  { value: '#e8524f', en: 'Red', he: 'אדום' },
  { value: '#7dcbb4', en: 'Green', he: 'ירוק' },
  { value: '#5fc4dd', en: 'Teal', he: 'טורקיז' },
  { value: '#f8cf6e', en: 'Yellow', he: 'צהוב' },
  { value: '#f8a271', en: 'Orange', he: 'כתום' },
  { value: '#91b8fa', en: 'Blue', he: 'כחול' },
  { value: '#c09af1', en: 'Purple', he: 'סגול' },
];
/** Shapes with a look-alike partner used as a distractor on the top level. */
export const shapes = [
  { value: '●', en: 'Circle', he: 'עיגול', lookalike: 6 },
  { value: '▲', en: 'Triangle', he: 'משולש', lookalike: 5 },
  { value: '■', en: 'Square', he: 'ריבוע', lookalike: 5 },
  { value: '★', en: 'Star', he: 'כוכב', lookalike: 4 },
  { value: '♥', en: 'Heart', he: 'לב', lookalike: 3 },
  { value: '◆', en: 'Diamond', he: 'מעוין', lookalike: 2 },
  { value: '☾', en: 'Moon', he: 'ירח', lookalike: 0 },
];
export const friends = [
  { value: '🐶', en: 'Johnny', he: 'ג׳וני' },
  { value: '👶', en: 'Dean', he: 'דין' },
  { value: '🐰', en: 'Bunny', he: 'ארנבון' },
  { value: '🐱', en: 'Kitten', he: 'חתלתול' },
  { value: '🦊', en: 'Fox', he: 'שועל' },
  { value: '🐼', en: 'Panda', he: 'פנדה' },
  { value: '🐸', en: 'Frog', he: 'צפרדע' },
  { value: '🦄', en: 'Unicorn', he: 'חד-קרן' },
];
export const fruit = ['🍓', '🍋', '🍇', '🍎', '🍌', '🍉'];
export const fruitNames: Record<Lang, string[]> = {
  en: ['Strawberry', 'Lemon', 'Grapes', 'Apple', 'Banana', 'Watermelon'],
  he: ['תות', 'לימון', 'ענבים', 'תפוח', 'בננה', 'אבטיח'],
};
export const ROUNDS = 5;
export type Question = {
  answer: number;
  choices: number[];
  sequence?: string[];
  count?: number;
  /** Per-star jitter for the counting game: [dx px, dy px, rotation deg]. */
  scatter?: [number, number, number][];
  shape?: number;
  /** Rotation in degrees and a color index for the shape target. */
  shapeStyle?: { rotate: number; color: number };
  color?: number;
  /** Rocket Sums: the equation to solve. */
  sum?: { a: number; b: number; op: '+' | '-' };
  /** Space Spelling: the picture, its word, which index is hidden and the
   *  letter options that `choices` index into. */
  word?: { emoji: string; text: string; missing: number; letters: string[] };
};
/** Inclusive star-count range for each level, easing up over the rounds. */
export const countRange: Record<Level, [number, number]> = {
  0: [2, 5],
  1: [3, 7],
  2: [5, 10],
};
/**
 * Builds one round. `avoid` is the previous round's answer (a count, color or
 * shape index) so the same target never appears twice in a row; Space
 * Spelling passes every word index already used in this game.
 */
export function makeQuestion(
  id: GameId,
  round: number,
  level: Level = 0,
  random: Random = Math.random,
  avoid?: number | number[],
  lang: Lang = 'en',
): Question {
  if (id === 'letters')
    return makeWord(round, level, random, [avoid ?? []].flat(), lang);
  if (Array.isArray(avoid)) avoid = avoid[avoid.length - 1];
  if (id === 'sums') return makeSum(round, level, random, avoid);
  if (id === 'count') {
    const [lo, hi] = countRange[level];
    const focus = lo + Math.round(((hi - lo) * round) / (ROUNDS - 1));
    const options = [focus - 1, focus, focus + 1].filter(
      (n) => n >= lo && n <= hi && n !== avoid,
    );
    const count = pick(options.length ? options : [focus], random);
    const distractors = shuffle(
      [count - 2, count - 1, count + 1, count + 2].filter((n) => n >= 1),
      random,
    )
      .sort((a, b) => Math.abs(a - count) - Math.abs(b - count))
      .slice(0, level === 2 ? 3 : 2);
    return {
      answer: count,
      count,
      scatter: Array.from({ length: count }, () =>
        level === 0
          ? [0, 0, 0]
          : [
              randInt(-6, 6, random),
              randInt(-14, 14, random),
              randInt(-28, 28, random),
            ],
      ),
      choices: shuffle([count, ...distractors], random),
    };
  }
  if (id === 'colors') {
    const color = pick(
      colors.map((_, i) => i).filter((i) => i !== avoid),
      random,
    );
    const twin = color ^ 1;
    const others = shuffle(
      colors.map((_, i) => i).filter((i) => i !== color && i !== twin),
      random,
    );
    const total = level === 2 ? 6 : 4;
    const distractors =
      level === 0
        ? others.slice(0, total - 1)
        : [twin, ...others.slice(0, total - 2)];
    return {
      answer: color,
      color,
      choices: shuffle([color, ...distractors], random),
    };
  }
  if (id === 'shapes') {
    const shape = pick(
      shapes.map((_, i) => i).filter((i) => i !== avoid),
      random,
    );
    const twin = shapes[shape].lookalike;
    const others = shuffle(
      shapes.map((_, i) => i).filter((i) => i !== shape && i !== twin),
      random,
    );
    const distractors =
      level === 0
        ? others.slice(0, 2)
        : level === 1
          ? others.slice(0, 3)
          : [twin, ...others.slice(0, 2)];
    return {
      answer: shape,
      shape,
      shapeStyle:
        level === 0
          ? { rotate: 0, color: -1 }
          : {
              rotate: pick([-22, -15, 15, 22], random),
              color: randInt(0, colors.length - 1, random),
            },
      choices: shuffle([shape, ...distractors], random),
    };
  }
  // patterns
  const kinds: string[][] = [
    ['ab'],
    ['ab', 'aab', 'abb'],
    ['aab', 'abb', 'abc'],
  ];
  const kind = kinds[level][Math.min(round, kinds[level].length - 1)];
  const letters = [...new Set(kind.split(''))];
  const chosen = shuffle(
    fruit.map((_, i) => i),
    random,
  ).slice(0, letters.length);
  const unit = kind.split('').map((c) => chosen[letters.indexOf(c)]);
  // Show at least two full repeats; never more than eight so a phone fits it.
  const shown = Math.min(
    8,
    unit.length * 2 + (level === 0 ? 1 : randInt(0, unit.length, random)),
  );
  const indices = Array.from(
    { length: shown },
    (_, i) => unit[i % unit.length],
  );
  const answer = unit[shown % unit.length];
  const extra = shuffle(
    fruit.map((_, i) => i).filter((i) => !chosen.includes(i)),
    random,
  );
  const choiceCount = level === 2 ? 4 : 3;
  const choices = [...new Set([...chosen, ...extra])].slice(0, choiceCount);
  if (!choices.includes(answer)) choices[choices.length - 1] = answer;
  return {
    answer,
    sequence: indices.map((i) => fruit[i]),
    choices: shuffle(choices, random),
  };
}
export const memoryPairs: Record<Level, number> = { 0: 4, 1: 6, 2: 8 };
export const makeMemoryDeck = (
  level: Level = 0,
  random: Random = Math.random,
) => {
  const chosen = shuffle(
    friends.map((_, i) => i),
    random,
  ).slice(0, memoryPairs[level]);
  return shuffle([...chosen, ...chosen], random);
};
export const BUBBLES = 10;
/** Level 2 is a rocket countdown from ten down to one. */
export const bubbleOrder = (level: Level) =>
  level === 2
    ? Array.from({ length: BUBBLES }, (_, i) => BUBBLES - i)
    : Array.from({ length: BUBBLES }, (_, i) => i + 1);

/** Inclusive largest total for Rocket Sums at each level. */
export const sumLimit: Record<Level, number> = { 0: 10, 1: 10, 2: 20 };
const nearby = (
  answer: number,
  extras: number[],
  n: number,
  random: Random,
) => {
  const pool = [
    ...new Set([answer - 1, answer + 1, answer - 2, answer + 2, ...extras]),
  ].filter((v) => v >= 0 && v !== answer);
  const close = shuffle(pool.slice(0, 2), random);
  const far = shuffle(pool.slice(2), random);
  return [...close, ...far].slice(0, n);
};
function makeSum(
  round: number,
  level: Level,
  random: Random,
  avoid?: number,
): Question {
  const limit = sumLimit[level];
  // Level 0 is addition only; later levels mix in taking away.
  const op: '+' | '-' = level === 0 || random() < 0.5 ? '+' : '-';
  for (let attempt = 0; attempt < 40; attempt++) {
    let a: number, b: number, answer: number;
    if (op === '+') {
      // Totals creep upward through the rounds.
      const top = Math.min(limit, Math.ceil(limit * (0.5 + round / 8)));
      a = randInt(1, top - 1, random);
      b = randInt(1, top - a, random);
      answer = a + b;
    } else {
      a = randInt(2, limit, random);
      b = randInt(1, a - 1, random);
      answer = a - b;
    }
    if (answer === avoid && attempt < 39) continue;
    const trap = op === '+' ? Math.abs(a - b) : a + b;
    const distractors = nearby(answer, [trap], level === 0 ? 2 : 3, random);
    return {
      answer,
      sum: { a, b, op },
      choices: shuffle([answer, ...distractors], random),
    };
  }
  return { answer: 2, sum: { a: 1, b: 1, op: '+' }, choices: [1, 2, 3] };
}
/** Picture words for Space Spelling, in both languages. */
export const words = [
  { emoji: '⭐', en: 'STAR', he: 'כוכב' },
  { emoji: '🌙', en: 'MOON', he: 'ירח' },
  { emoji: '☀️', en: 'SUN', he: 'שמש' },
  { emoji: '🐶', en: 'DOG', he: 'כלב' },
  { emoji: '🐱', en: 'CAT', he: 'חתול' },
  { emoji: '🐟', en: 'FISH', he: 'דג' },
  { emoji: '🏠', en: 'HOUSE', he: 'בית' },
  { emoji: '🍎', en: 'APPLE', he: 'תפוח' },
  { emoji: '🌸', en: 'FLOWER', he: 'פרח' },
  { emoji: '👶', en: 'BABY', he: 'תינוק' },
  { emoji: '🎈', en: 'BALLOON', he: 'בלון' },
  { emoji: '🐸', en: 'FROG', he: 'צפרדע' },
  { emoji: '🚀', en: 'ROCKET', he: 'טיל' },
  { emoji: '🍌', en: 'BANANA', he: 'בננה' },
  { emoji: '🌈', en: 'RAINBOW', he: 'קשת' },
  { emoji: '🐘', en: 'ELEPHANT', he: 'פיל' },
];
const alphabets: Record<Lang, string[]> = {
  en: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
  he: 'אבגדהוזחטיכלמנסעפצקרשת'.split(''),
};
const hebrewFinals = 'ךםןףץ'.split('');
/** Letters that young readers mix up; used as distractors on the top level. */
const confusable: Record<Lang, Record<string, string>> = {
  en: {
    B: 'DPR',
    D: 'BPQ',
    P: 'BDQ',
    Q: 'PDG',
    M: 'NW',
    N: 'MH',
    W: 'MV',
    O: 'QC',
    C: 'OG',
    G: 'CQ',
    E: 'FB',
    F: 'EP',
    I: 'LT',
    L: 'IT',
    T: 'LI',
    U: 'VN',
    V: 'UW',
    S: 'Z',
    Z: 'S',
    H: 'NM',
    A: 'R',
    R: 'AB',
    K: 'X',
    X: 'KY',
    Y: 'VX',
    J: 'IL',
  },
  he: {
    ב: 'כנ',
    כ: 'בנ',
    נ: 'גכ',
    ג: 'נז',
    ר: 'דך',
    ד: 'רך',
    ו: 'זי',
    ז: 'וי',
    י: 'וז',
    ח: 'תה',
    ת: 'חה',
    ה: 'חת',
    ט: 'םמ',
    מ: 'םט',
    ס: 'םפ',
    פ: 'סף',
    ע: 'צא',
    צ: 'עא',
    א: 'עצ',
    ל: 'ך',
    ק: 'ף',
    ש: 'טע',
    ך: 'ר',
    ם: 'סמ',
    ן: 'ו',
    ף: 'ק',
    ץ: 'צ',
  },
};
/** Longest word allowed at each level. */
export const wordLength: Record<Level, number> = { 0: 4, 1: 5, 2: 99 };
function makeWord(
  round: number,
  level: Level,
  random: Random,
  avoid: number[],
  lang: Lang,
): Question {
  const eligible = words
    .map((w, i) => i)
    .filter(
      (i) => words[i][lang].length <= wordLength[level] && !avoid.includes(i),
    );
  const index = pick(eligible.length ? eligible : [0], random);
  const text = words[index][lang];
  const chars = text.split('');
  // Beginners fill in the first letter; later the gap can be anywhere.
  const missing = level === 0 ? 0 : randInt(0, chars.length - 1, random);
  const target = chars[missing];
  const isFinal = hebrewFinals.includes(target);
  const pool = isFinal ? hebrewFinals : alphabets[lang];
  const wanted = level === 0 ? 3 : 4;
  const tricky =
    level === 2
      ? shuffle(
          [
            ...(confusable[lang][target] ?? '').split(''),
            ...chars.filter((c, i) => i !== missing),
          ],
          random,
        )
      : [];
  const options = [target];
  for (const c of [...tricky, ...shuffle(pool, random)]) {
    if (options.length >= wanted) break;
    if (!options.includes(c) && pool.concat(hebrewFinals).includes(c))
      options.push(c);
  }
  const letters = shuffle(options, random);
  return {
    answer: letters.indexOf(target),
    choices: letters.map((_, i) => i),
    word: { emoji: words[index].emoji, text, missing, letters },
  };
}
/** Galaxy Sequence: how many planets light up in each round of a level. */
export const sequenceLengths: Record<Level, number[]> = {
  0: [3, 3, 4, 4, 5],
  1: [4, 4, 5, 5, 6],
  2: [5, 5, 6, 6, 7],
};
export const sequenceTiles = (level: Level) => (level === 0 ? 4 : 6);
export const makeSequence = (
  level: Level,
  round: number,
  random: Random = Math.random,
): number[] => {
  const tiles = sequenceTiles(level);
  const steps: number[] = [];
  const length = sequenceLengths[level][Math.min(round, ROUNDS - 1)];
  while (steps.length < length) {
    const next = randInt(0, tiles - 1, random);
    // No planet lights up twice in a row, so each step is easy to see.
    if (next !== steps[steps.length - 1]) steps.push(next);
  }
  return steps;
};

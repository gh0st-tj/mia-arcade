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
};
/** Inclusive star-count range for each level, easing up over the rounds. */
export const countRange: Record<Level, [number, number]> = {
  0: [2, 5],
  1: [3, 7],
  2: [5, 10],
};
/**
 * Builds one round. `avoid` is the previous round's answer (a count, color or
 * shape index) so the same target never appears twice in a row.
 */
export function makeQuestion(
  id: GameId,
  round: number,
  level: Level = 0,
  random: Random = Math.random,
  avoid?: number,
): Question {
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

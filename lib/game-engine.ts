import type { GameId, Lang } from './game-data';
export const shuffle = <T>(items: T[], random = Math.random): T[] => {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};
export const colors = [
  { value: '#f37eae', en: 'Pink', he: 'ורוד' },
  { value: '#7dcbb4', en: 'Green', he: 'ירוק' },
  { value: '#f8cf6e', en: 'Yellow', he: 'צהוב' },
  { value: '#91b8fa', en: 'Blue', he: 'כחול' },
  { value: '#c09af1', en: 'Purple', he: 'סגול' },
  { value: '#f8a271', en: 'Orange', he: 'כתום' },
];
export const shapes = [
  { value: '●', en: 'Circle', he: 'עיגול' },
  { value: '▲', en: 'Triangle', he: 'משולש' },
  { value: '■', en: 'Square', he: 'ריבוע' },
  { value: '★', en: 'Star', he: 'כוכב' },
  { value: '♥', en: 'Heart', he: 'לב' },
];
export const friends = [
  { value: '🐶', en: 'Johnny', he: 'ג׳וני' },
  { value: '👶', en: 'Dean', he: 'דין' },
  { value: '🐰', en: 'Bunny', he: 'ארנבון' },
  { value: '🐱', en: 'Kitten', he: 'חתלתול' },
];
export type Question = {
  answer: number;
  choices: number[];
  sequence?: string[];
  count?: number;
  shape?: number;
  color?: number;
};
export function makeQuestion(id: GameId, round: number): Question {
  if (id === 'count') {
    const count = round + 2;
    return {
      answer: count,
      count,
      choices: shuffle([count, Math.max(1, count - 1), count + 1]),
    };
  }
  if (id === 'colors') {
    const color = round % colors.length;
    return {
      answer: color,
      color,
      choices: shuffle([
        color,
        ...shuffle(colors.map((_, i) => i).filter((i) => i !== color)).slice(
          0,
          3,
        ),
      ]),
    };
  }
  if (id === 'shapes') {
    const shape = round % shapes.length;
    return {
      answer: shape,
      shape,
      choices: shuffle([
        shape,
        ...shuffle(shapes.map((_, i) => i).filter((i) => i !== shape)).slice(
          0,
          2,
        ),
      ]),
    };
  }
  const fruit = ['🍓', '🍋', '🍇', '🍎'];
  const a = round % 4,
    b = (round + 1) % 4;
  const indices = round < 3 ? [a, b, a, b, a] : [a, a, b, a, a];
  return {
    answer: b,
    sequence: indices.map((i) => fruit[i]),
    choices: shuffle([a, b, (round + 2) % 4]),
  };
}
export const fruit = ['🍓', '🍋', '🍇', '🍎'];
export const fruitNames: Record<Lang, string[]> = {
  en: ['Strawberry', 'Lemon', 'Grapes', 'Apple'],
  he: ['תות', 'לימון', 'ענבים', 'תפוח'],
};
export const makeMemoryDeck = () => shuffle([0, 1, 2, 3, 0, 1, 2, 3]);

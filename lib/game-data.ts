export type Lang = 'en' | 'he';
export type GameId =
  | 'count'
  | 'colors'
  | 'memory'
  | 'shapes'
  | 'patterns'
  | 'bubbles';
type Words = Record<Lang, string>;
export const games: {
  id: GameId;
  title: Words;
  description: Words;
  instruction: Words;
  skill: Words;
  color: string;
  emoji: string;
}[] = [
  {
    id: 'count',
    title: { en: 'Star Catcher', he: 'אוספת הכוכבים' },
    description: {
      en: 'A little counting. A lot of sparkle.',
      he: 'סופרים קצת, מנצנצים הרבה.',
    },
    instruction: {
      en: 'Count the stars, then tap the number.',
      he: 'ספרי את הכוכבים ולחצי על המספר.',
    },
    skill: { en: 'Counting', he: 'ספירה' },
    color: '#b89aff',
    emoji: '⭐',
  },
  {
    id: 'colors',
    title: { en: 'Mia’s Color Studio', he: 'הצבעים של מיה' },
    description: {
      en: 'Find the color. Make some magic.',
      he: 'מוצאים את הצבע ויוצרים קסם.',
    },
    instruction: {
      en: 'Find the paint that matches the big color.',
      he: 'מצאי את הצבע שמתאים לדוגמה הגדולה.',
    },
    skill: { en: 'Colors', he: 'צבעים' },
    color: '#ffa2c4',
    emoji: '🎨',
  },
  {
    id: 'memory',
    title: { en: 'Johnny & Friends', he: 'ג׳וני וחברים' },
    description: {
      en: 'Little friends, lovely matches.',
      he: 'חברים קטנים, זוגות מתוקים.',
    },
    instruction: {
      en: 'Turn over two cards. Find all the matching friends!',
      he: 'הפכי שני קלפים ומצאי את כל הזוגות!',
    },
    skill: { en: 'Memory', he: 'זיכרון' },
    color: '#83dfc7',
    emoji: '🐶',
  },
  {
    id: 'shapes',
    title: { en: 'Dean’s Toy Box', he: 'הצעצועים של דין' },
    description: {
      en: 'A shape adventure for baby Dean.',
      he: 'עוזרים לדין למצוא את הצורה.',
    },
    instruction: {
      en: 'Help baby Dean! Tap the shape that matches.',
      he: 'עזרי לתינוק דין! לחצי על הצורה המתאימה.',
    },
    skill: { en: 'Shapes', he: 'צורות' },
    color: '#ffc680',
    emoji: '🧸',
  },
  {
    id: 'patterns',
    title: { en: 'Picnic Patterns', he: 'פיקניק משפחתי' },
    description: {
      en: 'What comes next at our picnic?',
      he: 'מה מגיע עכשיו בפיקניק שלנו?',
    },
    instruction: {
      en: 'Look at the pattern. What comes next?',
      he: 'הסתכלי על הסדר. מה מגיע עכשיו?',
    },
    skill: { en: 'Thinking', he: 'חשיבה' },
    color: '#a4bcff',
    emoji: '🍓',
  },
  {
    id: 'bubbles',
    title: { en: 'Bubble Pop!', he: 'פופ! בועות' },
    description: {
      en: 'Pop, pop, pop your way to ten.',
      he: 'מפוצצים בועות בדרך לעשר.',
    },
    instruction: {
      en: 'Pop the bubbles in order. Start with one!',
      he: 'פוצצי את הבועות לפי הסדר. התחילי באחת!',
    },
    skill: { en: 'Number play', he: 'מספרים' },
    color: '#e2a6f8',
    emoji: '🫧',
  },
];

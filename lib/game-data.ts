export type Lang = 'en' | 'he';
export type GameId =
  | 'count'
  | 'colors'
  | 'memory'
  | 'shapes'
  | 'patterns'
  | 'bubbles'
  | 'sums'
  | 'letters'
  | 'sequence'
  | 'trail'
  | 'market'
  | 'robot';
type Words = Record<Lang, string>;
export const games: {
  id: GameId;
  title: Words;
  description: Words;
  instruction: Words;
  skill: Words;
  ages: Words;
  color: string;
  emoji: string;
  difficulty: readonly [1 | 2 | 3, 1 | 2 | 3, 1 | 2 | 3];
}[] = [
  {
    id: 'count',
    difficulty: [1, 1, 2],
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
    ages: { en: 'Ages 4–6', he: 'גילאי 4–6' },
    color: '#b89aff',
    emoji: '⭐',
  },
  {
    id: 'colors',
    difficulty: [1, 2, 2],
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
    ages: { en: 'Ages 4–6', he: 'גילאי 4–6' },
    color: '#ffa2c4',
    emoji: '🎨',
  },
  {
    id: 'memory',
    difficulty: [1, 2, 3],
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
    ages: { en: 'Ages 4–6', he: 'גילאי 4–6' },
    color: '#83dfc7',
    emoji: '🐶',
  },
  {
    id: 'shapes',
    difficulty: [1, 2, 2],
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
    ages: { en: 'Ages 4–6', he: 'גילאי 4–6' },
    color: '#ffc680',
    emoji: '🧸',
  },
  {
    id: 'patterns',
    difficulty: [1, 2, 3],
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
    ages: { en: 'Ages 4–6', he: 'גילאי 4–6' },
    color: '#a4bcff',
    emoji: '🍓',
  },
  {
    id: 'bubbles',
    difficulty: [1, 1, 2],
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
    ages: { en: 'Ages 4–6', he: 'גילאי 4–6' },
    color: '#e2a6f8',
    emoji: '🫧',
  },
  {
    id: 'trail',
    difficulty: [2, 2, 2],
    title: { en: 'Johnny’s Treasure Trail', he: 'מסלול האוצר של ג׳וני' },
    description: {
      en: 'A snack, a winding path, a happy pup.',
      he: 'חטיף, שביל מתפתל וכלבלב שמח.',
    },
    instruction: {
      en: 'Guide Johnny one square at a time. Collect the bone, then reach his home!',
      he: 'הובילי את ג׳וני משבצת אחת בכל פעם. אספי את העצם ואז הגיעי לבית שלו!',
    },
    skill: { en: 'Planning', he: 'תכנון' },
    ages: { en: 'Ages 5–6', he: 'גילאי 5–6' },
    color: '#83dfc7',
    emoji: '🦴',
  },
  {
    id: 'market',
    difficulty: [2, 2, 2],
    title: { en: 'Mia’s Mini Market', he: 'המכולת של מיה' },
    description: {
      en: 'Pack just the right picnic for everyone.',
      he: 'אורזים בדיוק את הפיקניק שכולם צריכים.',
    },
    instruction: {
      en: 'Look at the picnic list. Add the right food to your basket, then check it!',
      he: 'הסתכלי ברשימת הפיקניק. הוסיפי לסל את האוכל המתאים ואז בדקי אותו!',
    },
    skill: { en: 'Counting & planning', he: 'ספירה ותכנון' },
    ages: { en: 'Ages 5–6', he: 'גילאי 5–6' },
    color: '#ffc680',
    emoji: '🧺',
  },
  {
    id: 'robot',
    difficulty: [2, 2, 2],
    title: { en: 'Uncle Tom’s Robot Lab', he: 'הרובוטים של דוד טום' },
    description: {
      en: 'Pick a paint. Build a friendly little bot.',
      he: 'בוחרים צבע ובונים רובוט קטן וחברותי.',
    },
    instruction: {
      en: 'Help Uncle Tom build a robot! Choose a paint, then tap a part to match the little model.',
      he: 'עזרי לדוד טום לבנות רובוט! בחרי צבע ואז לחצי על חלק כדי להתאים לדגם הקטן.',
    },
    skill: { en: 'Building', he: 'בנייה' },
    ages: { en: 'Ages 5–6', he: 'גילאי 5–6' },
    color: '#a4bcff',
    emoji: '🤖',
  },
  {
    id: 'sums',
    difficulty: [3, 3, 3],
    title: { en: 'Rocket Sums', he: 'חשבון רקטות' },
    description: {
      en: 'Add it up, take it away, blast off!',
      he: 'מחברים, מחסרים וממריאים!',
    },
    instruction: {
      en: 'Work out the sum, then tap the answer.',
      he: 'פתרי את התרגיל ולחצי על התשובה.',
    },
    skill: { en: 'Adding', he: 'חשבון' },
    ages: { en: 'Ages 6–7', he: 'גילאי 6–7' },
    color: '#ff9d7a',
    emoji: '🚀',
  },
  {
    id: 'letters',
    difficulty: [3, 3, 3],
    title: { en: 'Space Spelling', he: 'איות בחלל' },
    description: {
      en: 'One letter is lost in space. Find it!',
      he: 'אות אחת הלכה לאיבוד בחלל. מצאי אותה!',
    },
    instruction: {
      en: 'Look at the picture. Which letter is missing from the word?',
      he: 'הסתכלי על התמונה. איזו אות חסרה במילה?',
    },
    skill: { en: 'Letters', he: 'אותיות' },
    ages: { en: 'Ages 6–7', he: 'גילאי 6–7' },
    color: '#8fd6ff',
    emoji: '🔤',
  },
  {
    id: 'sequence',
    difficulty: [3, 3, 3],
    title: { en: 'Galaxy Sequence', he: 'רצף גלקטי' },
    description: {
      en: 'Watch the planets. Repeat the order.',
      he: 'צופים בכוכבי הלכת וחוזרים על הסדר.',
    },
    instruction: {
      en: 'Watch the planets light up, then tap them in the same order.',
      he: 'צפי בכוכבי הלכת נדלקים, ואז לחצי עליהם באותו הסדר.',
    },
    skill: { en: 'Focus', he: 'ריכוז' },
    ages: { en: 'Ages 6–7', he: 'גילאי 6–7' },
    color: '#ffd66b',
    emoji: '🪐',
  },
];

/** Bubble Pop’s third star is a rocket countdown, so it needs its own line. */
export const countdownInstruction: Words = {
  en: 'Countdown! Pop the bubbles from ten down to one, then blast off!',
  he: 'ספירה לאחור! פוצצי את הבועות מעשר עד אחת, ואז המראה!',
};
export const instructionFor = (id: GameId, level: number, lang: Lang) =>
  id === 'bubbles' && level === 2
    ? countdownInstruction[lang]
    : games.find((g) => g.id === id)!.instruction[lang];
/** Audio-manifest key for a game’s spoken instruction at a given level. */
export const instructionKey = (id: GameId, level: number) =>
  id === 'bubbles' && level === 2 ? 'countdown' : id;

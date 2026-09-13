export type SpeakingPrompt = { en: string; he: string; emoji: string };
export type SpeakingLevel = {
  title: { en: string; he: string };
  stage: 'words' | 'phrases' | 'sentences';
  prompts: SpeakingPrompt[];
};

const lesson = (
  en: string,
  he: string,
  stage: SpeakingLevel['stage'],
  rows: string[],
): SpeakingLevel => ({
  title: { en, he },
  stage,
  prompts: rows.map((row) => {
    const [en, he, emoji] = row.split('|');
    return { en, he, emoji };
  }),
});

// Stable order: a saved frontier counts mastered prompts, never attempts.
export const englishCourse: SpeakingLevel[] = [
  lesson('Animal friends', 'חברים חיות', 'words', [
    'cat|חתול|🐱',
    'dog|כלב|🐶',
    'fish|דג|🐟',
    'bird|ציפור|🐦',
    'duck|ברווז|🦆',
  ]),
  lesson('Yummy fruit', 'פירות טעימים', 'words', [
    'apple|תפוח|🍎',
    'banana|בננה|🍌',
    'pear|אגס|🍐',
    'lemon|לימון|🍋',
    'grape|ענב|🍇',
  ]),
  lesson('Rainbow colors', 'צבעי הקשת', 'words', [
    'red|אדום|🔴',
    'blue|כחול|🔵',
    'green|ירוק|🟢',
    'yellow|צהוב|🟡',
    'pink|ורוד|🩷',
  ]),
  lesson('Count to five', 'סופרים עד חמש', 'words', [
    'one|אחת|1️⃣',
    'two|שתיים|2️⃣',
    'three|שלוש|3️⃣',
    'four|ארבע|4️⃣',
    'five|חמש|5️⃣',
  ]),
  lesson('My family', 'המשפחה שלי', 'words', [
    'mom|אמא|👩',
    'dad|אבא|👨',
    'baby|תינוק|👶',
    'sister|אחות|👧',
    'brother|אח|👦',
  ]),
  lesson('Time to play', 'זמן לשחק', 'words', [
    'ball|כדור|⚽',
    'car|מכונית|🚗',
    'book|ספר|📚',
    'doll|בובה|🪆',
    'kite|עפיפון|🪁',
  ]),
  lesson('My body', 'הגוף שלי', 'words', [
    'hand|יד|✋',
    'foot|כף רגל|🦶',
    'eye|עין|👁️',
    'ear|אוזן|👂',
    'nose|אף|👃',
  ]),
  lesson('Outside', 'בחוץ', 'words', [
    'sun|שמש|☀️',
    'moon|ירח|🌙',
    'star|כוכב|⭐',
    'tree|עץ|🌳',
    'flower|פרח|🌸',
  ]),
  lesson('Snack time', 'זמן לאכול', 'words', [
    'water|מים|💧',
    'milk|חלב|🥛',
    'bread|לחם|🍞',
    'cheese|גבינה|🧀',
    'egg|ביצה|🥚',
  ]),
  lesson('Action words', 'מילים של תנועה', 'words', [
    'jump|לקפוץ|🦘',
    'run|לרוץ|🏃',
    'clap|למחוא כפיים|👏',
    'dance|לרקוד|💃',
    'swim|לשחות|🏊',
  ]),
  lesson('Hello, world!', 'שלום עולם!', 'phrases', [
    'hello|שלום|👋',
    'good morning|בוקר טוב|🌅',
    'good night|לילה טוב|🌙',
    'thank you|תודה|💝',
    'see you|להתראות|👋',
  ]),
  lesson('Colorful things', 'דברים צבעוניים', 'phrases', [
    'a red apple|תפוח אדום|🍎',
    'a yellow banana|בננה צהובה|🍌',
    'a green tree|עץ ירוק|🌳',
    'a pink flower|פרח ורוד|🌸',
    'a blue car|מכונית כחולה|🚙',
  ]),
  lesson('Big and small', 'גדול וקטן', 'phrases', [
    'a big dog|כלב גדול|🐕',
    'a small cat|חתול קטן|🐈',
    'a big tree|עץ גדול|🌳',
    'a small fish|דג קטן|🐟',
    'a big ball|כדור גדול|⚽',
  ]),
  lesson('Count together', 'סופרים יחד', 'phrases', [
    'one star|כוכב אחד|⭐',
    'two cats|שני חתולים|🐱',
    'three apples|שלושה תפוחים|🍎',
    'four birds|ארבע ציפורים|🐦',
    'five flowers|חמישה פרחים|🌸',
  ]),
  lesson('My little world', 'העולם הקטן שלי', 'phrases', [
    'my mom|אמא שלי|👩',
    'my dad|אבא שלי|👨',
    'my brother|אחי|👦',
    'my book|הספר שלי|📚',
    'my dog|הכלב שלי|🐶',
  ]),
  lesson('Kind words', 'מילים נעימות', 'phrases', [
    'yes please|כן בבקשה|😊',
    'no thank you|לא תודה|🙌',
    'excuse me|סליחה|👋',
    'your turn|תורך|🎲',
    'well done|כל הכבוד|🌟',
  ]),
  lesson('Let’s move', 'בואי נזוז', 'phrases', [
    'clap your hands|מחאי כפיים|👏',
    'touch your nose|געי באף שלך|👃',
    'wave your hand|נופפי ביד|👋',
    'stand up|עמדי|🧍',
    'sit down|שבי|🪑',
  ]),
  lesson('Little adventures', 'הרפתקאות קטנות', 'phrases', [
    'in the box|בתוך הקופסה|📦',
    'on the table|על השולחן|🪑',
    'under the tree|מתחת לעץ|🌳',
    'at the park|בפארק|🛝',
    'with my family|עם המשפחה שלי|👨‍👩‍👧‍👦',
  ]),
  lesson('All about me', 'הכול עליי', 'sentences', [
    'I am Mia.|אני מיה.|👧',
    'I am happy.|אני שמחה.|😊',
    'I am a girl.|אני ילדה.|👧',
    'I am kind.|אני נחמדה.|💝',
    'I am ready.|אני מוכנה.|✨',
  ]),
  lesson('I can do it', 'אני יכולה', 'sentences', [
    'I can jump.|אני יכולה לקפוץ.|🦘',
    'I can run.|אני יכולה לרוץ.|🏃',
    'I can dance.|אני יכולה לרקוד.|💃',
    'I can swim.|אני יכולה לשחות.|🏊',
    'I can clap.|אני יכולה למחוא כפיים.|👏',
  ]),
  lesson('Things I like', 'דברים שאני אוהבת', 'sentences', [
    'I like apples.|אני אוהבת תפוחים.|🍎',
    'I like cats.|אני אוהבת חתולים.|🐱',
    'I like milk.|אני אוהבת חלב.|🥛',
    'I like books.|אני אוהבת ספרים.|📚',
    'I like flowers.|אני אוהבת פרחים.|🌸',
  ]),
  lesson('Look around', 'מסתכלים סביב', 'sentences', [
    'I see a dog.|אני רואה כלב.|🐶',
    'I see a bird.|אני רואה ציפור.|🐦',
    'I see a star.|אני רואה כוכב.|⭐',
    'I see a tree.|אני רואה עץ.|🌳',
    'I see a flower.|אני רואה פרח.|🌸',
  ]),
  lesson('My treasures', 'האוצרות שלי', 'sentences', [
    'I have a ball.|יש לי כדור.|⚽',
    'I have a book.|יש לי ספר.|📚',
    'I have a kite.|יש לי עפיפון.|🪁',
    'I have a doll.|יש לי בובה.|🪆',
    'I have a dog.|יש לי כלב.|🐶',
  ]),
  lesson('Tell me about it', 'ספרי לי על זה', 'sentences', [
    'The apple is red.|התפוח אדום.|🍎',
    'The tree is green.|העץ ירוק.|🌳',
    'The banana is yellow.|הבננה צהובה.|🍌',
    'The dog is big.|הכלב גדול.|🐕',
    'The cat is small.|החתול קטן.|🐈',
  ]),
  lesson('At home', 'בבית', 'sentences', [
    'This is my mom.|זאת אמא שלי.|👩',
    'This is my dad.|זה אבא שלי.|👨',
    'This is my brother.|זה אחי.|👦',
    'I love my family.|אני אוהבת את המשפחה שלי.|💜',
    'My dog is happy.|הכלב שלי שמח.|🐶',
  ]),
  lesson('Ask nicely', 'מבקשים יפה', 'sentences', [
    'Can I have water, please?|אפשר לקבל מים בבקשה?|💧',
    'Can I have an apple, please?|אפשר לקבל תפוח בבקשה?|🍎',
    'Can you help me, please?|אפשר לעזור לי בבקשה?|🤝',
    'May I play with you?|אפשר לשחק איתך?|🧸',
    'Thank you for helping me.|תודה על העזרה.|💝',
  ]),
  lesson('Where is it?', 'איפה זה?', 'sentences', [
    'The cat is in the box.|החתול בתוך הקופסה.|📦',
    'The book is on the table.|הספר על השולחן.|📚',
    'The dog is under the tree.|הכלב מתחת לעץ.|🌳',
    'The bird is in the tree.|הציפור בתוך העץ.|🐦',
    'My ball is in the box.|הכדור שלי בתוך הקופסה.|⚽',
  ]),
  lesson('My day', 'היום שלי', 'sentences', [
    'I brush my teeth.|אני מצחצחת שיניים.|🪥',
    'I eat my breakfast.|אני אוכלת ארוחת בוקר.|🥣',
    'I play with my friends.|אני משחקת עם החברים שלי.|🛝',
    'I read a book.|אני קוראת ספר.|📖',
    'I go to bed.|אני הולכת לישון.|🛏️',
  ]),
  lesson('Let’s talk', 'בואי נדבר', 'sentences', [
    'How are you today?|מה שלומך היום?|👋',
    'I am very happy today.|אני שמחה מאוד היום.|😊',
    'What is your name?|מה שמך?|💬',
    'My name is Mia.|קוראים לי מיה.|👧',
    'It is nice to meet you.|נעים להכיר אותך.|🤝',
  ]),
  lesson('English superstar', 'כוכבת באנגלית', 'sentences', [
    'I can see a little bird.|אני יכולה לראות ציפור קטנה.|🐦',
    'I like to play with my dog.|אני אוהבת לשחק עם הכלב שלי.|🐶',
    'The little cat is in the box.|החתול הקטן בתוך הקופסה.|📦',
    'Can I have a red apple, please?|אפשר לקבל תפוח אדום בבקשה?|🍎',
    'I love learning English with my family.|אני אוהבת ללמוד אנגלית עם המשפחה שלי.|🌟',
  ]),
];

export const ENGLISH_TOTAL = englishCourse.reduce(
  (sum, level) => sum + level.prompts.length,
  0,
);
export const ENGLISH_STORAGE = 'mia-speaking-english-v1';
export const levelStart = (level: number) =>
  englishCourse
    .slice(0, level)
    .reduce((sum, item) => sum + item.prompts.length, 0);
export function restoreEnglishProgress(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(ENGLISH_TOTAL, Math.floor(value)))
    : 0;
}
export function englishPosition(progress: number) {
  const bounded = Math.min(restoreEnglishProgress(progress), ENGLISH_TOTAL - 1);
  let level = 0;
  while (level + 1 < englishCourse.length && levelStart(level + 1) <= bounded)
    level++;
  return { level, prompt: bounded - levelStart(level) };
}
export function advanceEnglishProgress(
  progress: number,
  level: number,
  prompt: number,
): number {
  if (!englishCourse[level]?.prompts[prompt]) return progress;
  const position = levelStart(level) + prompt;
  // Replays cannot inflate progress and a future challenge cannot skip a gap.
  return position === progress
    ? Math.min(ENGLISH_TOTAL, progress + 1)
    : progress;
}

const numbers: Record<string, string> = {
  '1': 'one',
  '2': 'two',
  '3': 'three',
  '4': 'four',
  '5': 'five',
};
export function normalizeSpeech(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/\bi'm\b/g, 'i am')
    .replace(/\bit's\b/g, 'it is')
    .replace(/\bwhat's\b/g, 'what is')
    .replace(/\bname's\b/g, 'name is')
    .replace(/\b([1-5])\b/g, (number) => numbers[number])
    .replace(/[^a-z0-9\s']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
export function matchesSpeech(transcript: string, target: string): boolean {
  const heard = normalizeSpeech(transcript);
  return heard.length > 0 && heard === normalizeSpeech(target);
}

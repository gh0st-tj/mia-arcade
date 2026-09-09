import { readFile, mkdir, writeFile, access } from 'node:fs/promises';
import { parseEnv } from 'node:util';
const root = new URL('../', import.meta.url);
let localEnv;
try {
  localEnv = await readFile(new URL('../.env', root), 'utf8');
} catch {
  localEnv = await readFile(new URL('.env', root), 'utf8');
}
const env = { ...parseEnv(localEnv), ...process.env };
if (!env.ELEVENLABS_API_KEY || !env.ELEVENLABS_VOICE_ID)
  throw Error(
    'Set ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID in the root .env file.',
  );
const phrases = {
  welcome: [
    'Welcome to your Babylon arcade, Mia! Choose a game and let’s play!',
    'ברוכה הבאה לבבילון שלך, מיה! בחרי משחק ובואי נשחק!',
  ],
  count: [
    'Count the stars, then tap the number.',
    'ספרי את הכוכבים ולחצי על המספר.',
  ],
  colors: [
    'Find the paint that matches the big color.',
    'מצאי את הצבע שמתאים לדוגמה הגדולה.',
  ],
  memory: [
    'Turn over two cards. Find all the matching friends!',
    'הפכי שני קלפים ומצאי את כל הזוגות!',
  ],
  shapes: [
    'Help baby Dean! Tap the shape that matches.',
    'עזרי לתינוק דין! לחצי על הצורה המתאימה.',
  ],
  patterns: [
    'Look at the pattern. What comes next?',
    'הסתכלי על הסדר. מה מגיע עכשיו?',
  ],
  bubbles: [
    'Pop the bubbles in order. Start with one!',
    'פוצצי את הבועות לפי הסדר. התחילי באחת!',
  ],
  win: [
    'Amazing, Mia! You earned a star! Lee, Gal, Dean and Johnny are cheering for you!',
    'כל הכבוד מיה! זכית בכוכב! לי, גל, דין וג׳וני שמחים איתך!',
  ],
  retry: ['Let’s try another one. You can do it!', 'בואי ננסה שוב. את יכולה!'],
};
const en = [
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
];
const he = [
  'אחת',
  'שתיים',
  'שלוש',
  'ארבע',
  'חמש',
  'שש',
  'שבע',
  'שמונה',
  'תשע',
  'עשר',
];
for (let i = 0; i < 10; i++) phrases[`number-${i + 1}`] = [en[i], he[i]];
let manifest = {};
try {
  manifest = JSON.parse(
    await readFile(new URL('lib/audio-manifest.json', root), 'utf8'),
  );
} catch {}
const force = process.argv.includes('--force');
for (const [index, lang] of ['en', 'he'].entries()) {
  const dir = new URL(`public/audio/${lang}/`, root);
  await mkdir(dir, { recursive: true });
  for (const [name, texts] of Object.entries(phrases)) {
    const dest = new URL(`${name}.mp3`, dir);
    if (!force) {
      try {
        await access(dest);
        console.log(`Kept ${lang}/${name}`);
        continue;
      } catch {}
    }
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(env.ELEVENLABS_VOICE_ID)}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: texts[index],
          model_id:
            lang === 'he'
              ? env.ELEVENLABS_HEBREW_MODEL || 'eleven_v3'
              : env.ELEVENLABS_MODEL || 'eleven_turbo_v2_5',
        }),
        signal: AbortSignal.timeout(60000),
      },
    );
    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      console.error(
        'Provider reason:',
        detail?.detail?.status || 'unavailable',
      );
      console.error(
        `Voice generation stopped: HTTP ${response.status} for ${lang}/${name}. Check ElevenLabs key, voice access, model and credits. Browser speech remains available.`,
      );
      process.exitCode = 1;
      process.exit();
    }
    if (!response.headers.get('content-type')?.startsWith('audio/'))
      throw Error('Unexpected non-audio response; no file saved.');
    await writeFile(dest, Buffer.from(await response.arrayBuffer()));
    manifest[`${lang}/${name}`] = true;
    await writeFile(
      new URL('lib/audio-manifest.json', root),
      JSON.stringify(manifest, null, 2) + '\n',
    );
    console.log(`Saved ${lang}/${name}.mp3`);
  }
}

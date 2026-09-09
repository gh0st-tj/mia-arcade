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
const catalog = JSON.parse(
  await readFile(new URL('lib/voice-lines.json', root), 'utf8'),
);
const phrases = Object.fromEntries(
  Object.values(catalog)
    .flat()
    .map((line) => [line.id, [line.en, line.he]]),
);
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
        manifest[`${lang}/${name}`] = true;
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

// Also repair the manifest when every recording was already on disk.
await writeFile(
  new URL('lib/audio-manifest.json', root),
  JSON.stringify(manifest, null, 2) + '\n',
);

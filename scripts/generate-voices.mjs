import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import { parseEnv, parseArgs } from 'node:util';
import { speechRequest, fingerprint } from './voice-config.mjs';

const root = new URL('../', import.meta.url);
const { values } = parseArgs({
  options: {
    lang: { type: 'string' },
    only: { type: 'string' },
    force: { type: 'boolean', default: false },
    'dry-run': { type: 'boolean', default: false },
  },
});
const languages = values.lang ? [values.lang] : ['en', 'he'];
if (languages.some((lang) => !['en', 'he'].includes(lang)))
  throw Error('--lang must be en or he.');
let localEnv = '';
for (const path of ['../.env', '.env']) {
  try {
    localEnv = await readFile(new URL(path, root), 'utf8');
    break;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}
const env = { ...parseEnv(localEnv), ...process.env };
if (!values['dry-run'] && !env.ELEVENLABS_API_KEY)
  throw Error('Set ELEVENLABS_API_KEY in .env or the environment.');
async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(new URL(path, root), 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}
async function atomicWrite(path, data) {
  const dest = new URL(path, root),
    temp = new URL(`${path}.tmp`, root);
  await writeFile(temp, data);
  await rename(temp, dest);
}
const catalog = await readJson('lib/voice-lines.json');
const allLines = Object.values(catalog).flat();
const only = values.only?.split(',');
if (only?.some((id) => !allLines.some((line) => line.id === id)))
  throw Error('--only contains an unknown recording ID.');
const lines = allLines.filter((line) => !only || only.includes(line.id));
const manifest = await readJson('lib/audio-manifest.json', {});
const versions = await readJson('lib/audio-versions.json', {});
const metadata = await readJson('lib/audio-generation.json', {});
const jobs = [];
// Validate the entire selection before spending credits or replacing files.
for (const lang of languages)
  for (const line of lines) {
    const key = `${lang}/${line.id}`;
    const request = speechRequest(line, lang, env);
    const requestHash = fingerprint(request);
    let existing;
    try {
      existing = await readFile(new URL(`public/audio/${key}.mp3`, root));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    const fileHash = existing && fingerprint(existing);
    const current =
      metadata[key]?.requestHash === requestHash &&
      metadata[key]?.audioHash === fileHash;
    // Retain legacy English clips; Hebrew needs provenance before it can be reused.
    if (
      !values.force &&
      existing?.length &&
      (current || (lang === 'en' && !metadata[key]))
    ) {
      manifest[key] = true;
      versions[key] = fileHash.slice(0, 12);
    } else jobs.push({ key, request, requestHash });
  }
console.log(
  `${jobs.length} clips to generate; ${jobs.reduce((n, j) => n + j.request.body.text.length, 0)} input characters. Generation uses ElevenLabs credits.`,
);
if (values['dry-run']) process.exit(0);
await mkdir(new URL('work/voice-backups/', root), { recursive: true });
for (const { key, request, requestHash } of jobs) {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(request.voiceId)}?output_format=mp3_44100_128`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request.body),
      signal: AbortSignal.timeout(60000),
    },
  );
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    throw Error(
      `HTTP ${response.status} for ${key}: ${detail?.detail?.status || 'unavailable'}. Completed clips are saved; rerun without --force to resume.`,
    );
  }
  if (!response.headers.get('content-type')?.startsWith('audio/'))
    throw Error(`Non-audio response for ${key}; original retained.`);
  const data = Buffer.from(await response.arrayBuffer());
  if (data.length < 1024)
    throw Error(`Empty or truncated response for ${key}; original retained.`);
  const path = `public/audio/${key}.mp3`;
  try {
    const old = await readFile(new URL(path, root));
    await writeFile(
      new URL(
        `work/voice-backups/${key.replace('/', '-')}-${fingerprint(old).slice(0, 12)}.mp3`,
        root,
      ),
      old,
      { flag: 'wx' },
    );
  } catch (error) {
    if (!['ENOENT', 'EEXIST'].includes(error.code)) throw error;
  }
  await mkdir(new URL(`public/audio/${key.split('/')[0]}/`, root), {
    recursive: true,
  });
  await atomicWrite(path, data);
  const audioHash = fingerprint(data);
  manifest[key] = true;
  versions[key] = audioHash.slice(0, 12);
  metadata[key] = {
    ...request,
    requestHash,
    audioHash,
    generatedAt: new Date().toISOString(),
  };
  await atomicWrite(
    'lib/audio-generation.json',
    JSON.stringify(metadata, null, 2) + '\n',
  );
  await atomicWrite(
    'lib/audio-versions.json',
    JSON.stringify(versions, null, 2) + '\n',
  );
  await atomicWrite(
    'lib/audio-manifest.json',
    JSON.stringify(manifest, null, 2) + '\n',
  );
  console.log(`Saved ${key}.mp3`);
}
await atomicWrite(
  'lib/audio-versions.json',
  JSON.stringify(versions, null, 2) + '\n',
);
await atomicWrite(
  'lib/audio-manifest.json',
  JSON.stringify(manifest, null, 2) + '\n',
);

import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { parseEnv } from 'node:util';
const root = new URL('../', import.meta.url);
let localEnv;
try {
  localEnv = await readFile(new URL('../.env', root), 'utf8');
} catch {
  localEnv = await readFile(new URL('.env', root), 'utf8');
}
const env = { ...parseEnv(localEnv), ...process.env };
const key = env.FAL_KEY || env.fal_api_key;
if (!key) throw Error('Add FAL_KEY or fal_api_key to your existing root .env.');
const output = new URL('public/video/mia-welcome.mp4', root);
try {
  await access(output);
  console.log('Welcome video already exists; no new generation requested.');
  process.exit(0);
} catch {}
await mkdir(new URL('work/', root), { recursive: true });
await mkdir(new URL('public/video/', root), { recursive: true });
const jobPath = new URL('work/fal-welcome.json', root);
const model = 'fal-ai/kling-video/v2.5-turbo/standard/image-to-video';
const prompt =
  'Animate this exact charming 3D toy family portrait as a gentle five-second welcome for a preschool arcade. The little girl Mia slowly waves her already raised hand and smiles warmly at the viewer. Baby Dean smiles and blinks while staying safely seated beside her. Their chestnut and white spaniel Johnny makes a tiny happy head tilt. Very subtle breathing, gentle star twinkles. All three remain seated on the lavender crescent moon. Preserve exactly the faces, outfits, number of characters, dog markings, moon, composition and polished toy style. Locked camera, no zoom, no cuts, no new objects, no text, no dialogue. Calm, sweet, magical, readable at small size.';
async function api(url, options = {}) {
  if (new URL(url).origin !== 'https://queue.fal.run')
    throw Error('Unexpected queue origin.');
  const r = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Key ${key}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(60000),
  });
  if (!r.ok) {
    const error = await r.json().catch(() => ({}));
    throw Error(
      `fal HTTP ${r.status}: ${JSON.stringify(error.detail || error.error || 'request failed').slice(0, 600)}`,
    );
  }
  return r.json();
}
let job;
try {
  job = JSON.parse(await readFile(jobPath, 'utf8'));
} catch {}
if (!job) {
  const image = await readFile(new URL('public/images/mia-space.png', root));
  job = await api(`https://queue.fal.run/${model}`, {
    method: 'POST',
    body: JSON.stringify({
      image_url: `data:image/png;base64,${image.toString('base64')}`,
      prompt,
      duration: '5',
      negative_prompt:
        'distortion, extra fingers, extra limbs, face morphing, duplicate characters, camera movement, text, watermarks, sudden motion',
      cfg_scale: 0.5,
    }),
  });
  await writeFile(jobPath, JSON.stringify({ ...job, model, prompt }, null, 2));
  console.log('Submitted one five-second welcome animation to fal.ai.');
}
const start = Date.now();
while (Date.now() - start < 30 * 60 * 1000) {
  const status = await api(job.status_url);
  console.log(`fal video: ${status.status}`);
  if (status.status === 'COMPLETED') {
    const result = await api(job.response_url);
    if (!result.video?.url)
      throw Error(
        'fal returned no video. Existing job retained; no automatic regeneration.',
      );
    const video = await fetch(result.video.url, {
      signal: AbortSignal.timeout(120000),
    });
    if (!video.ok) throw Error(`Video download failed: ${video.status}`);
    const bytes = Buffer.from(await video.arrayBuffer());
    if (bytes.length < 10000 || bytes.subarray(4, 8).toString() !== 'ftyp')
      throw Error('Invalid MP4 result.');
    await writeFile(output, bytes);
    await writeFile(
      jobPath,
      JSON.stringify({ ...job, model, prompt, result }, null, 2),
    );
    console.log(`Saved public/video/mia-welcome.mp4 (${bytes.length} bytes).`);
    process.exit(0);
  }
  if (!['IN_QUEUE', 'IN_PROGRESS'].includes(status.status))
    throw Error(`Unexpected fal status: ${status.status}`);
  await new Promise((resolve) => setTimeout(resolve, 15000));
}
throw Error(
  'Still processing. Run the command again to resume the same saved job without another charge.',
);

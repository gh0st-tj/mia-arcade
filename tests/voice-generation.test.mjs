import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { speechRequest, fingerprint } from '../scripts/voice-config.mjs';
const catalog = JSON.parse(
  readFileSync(new URL('../lib/voice-lines.json', import.meta.url)),
);
const env = {
  ELEVENLABS_VOICE_ID: 'english',
  ELEVENLABS_HEBREW_VOICE_ID: 'hebrew',
};

test('Hebrew cannot silently use an English voice or a model without Hebrew', () => {
  assert.throws(
    () =>
      speechRequest(catalog.welcome[0], 'he', {
        ELEVENLABS_VOICE_ID: 'english',
      }),
    /HEBREW_VOICE_ID/,
  );
  for (const model of [
    'eleven_multilingual_v2',
    'eleven_flash_v2_5',
    'eleven_turbo_v2_5',
  ])
    assert.throws(
      () =>
        speechRequest(catalog.welcome[0], 'he', {
          ...env,
          ELEVENLABS_HEBREW_MODEL: model,
        }),
      /eleven_v3/,
    );
});

test('pronunciation hints preserve every Hebrew word and English request', () => {
  for (const line of Object.values(catalog).flat()) {
    const request = speechRequest(line, 'he', env);
    assert.equal(
      request.body.text.replace(/[\u0591-\u05C7]/gu, ''),
      line.he.replaceAll('שתיים', 'שתים'),
      line.id,
    );
    assert.equal(request.body.language_code, 'he');
    assert.equal(speechRequest(line, 'en', env).body.text, line.en);
  }
  assert.match(speechRequest(catalog.count[0], 'he', env).body.text, /סִפְרִי/);
  assert.match(
    speechRequest(catalog['number-8'][0], 'he', env).body.text,
    /שְׁמוֹנֶה/,
  );
});

test('changing the voice, text, or settings invalidates a paid recording fingerprint', () => {
  const line = catalog.welcome[0];
  const original = speechRequest(line, 'he', env);
  const hash = fingerprint(original);
  assert.equal(fingerprint(speechRequest(line, 'he', env)), hash);
  assert.notEqual(
    fingerprint(speechRequest({ ...line, he: line.he + ' שלום!' }, 'he', env)),
    hash,
  );
  assert.notEqual(
    fingerprint(
      speechRequest(line, 'he', { ...env, ELEVENLABS_HEBREW_VOICE_ID: 'new' }),
    ),
    hash,
  );
  assert.notEqual(
    fingerprint({
      ...original,
      body: { ...original.body, voice_settings: { stability: 1 } },
    }),
    hash,
  );
});

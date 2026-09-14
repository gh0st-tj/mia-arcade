import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createLessonPlayer, englishExampleId } from '../lib/lesson-audio.ts';
import { createVoicePicker } from '../lib/voice-picker.ts';
import { englishCourse } from '../lib/english-course.ts';
import { speechRequest } from '../scripts/voice-config.mjs';
import { createHash } from 'node:crypto';

const lines = JSON.parse(
  readFileSync(new URL('../lib/speaking-lines.json', import.meta.url)),
);
const env = {
  ELEVENLABS_VOICE_ID: 'english',
  ELEVENLABS_HEBREW_VOICE_ID: 'hebrew',
  ELEVENLABS_MODEL: 'eleven_turbo_v2_5',
};

test('every course recording exists with the correct model, cache version, and content hash', () => {
  const manifest = JSON.parse(
    readFileSync(new URL('../lib/audio-manifest.json', import.meta.url)),
  );
  const versions = JSON.parse(
    readFileSync(new URL('../lib/audio-versions.json', import.meta.url)),
  );
  const metadata = JSON.parse(
    readFileSync(new URL('../lib/audio-generation.json', import.meta.url)),
  );
  const expected = ['en', 'he'].flatMap((lang) =>
    Object.values(lines)
      .flat()
      .map((line) => ({ key: `${lang}/${line.id}`, model: 'eleven_v3' })),
  );
  englishCourse.forEach((level, l) =>
    level.prompts.forEach((_, p) =>
      expected.push({
        key: `en/${englishExampleId(l, p)}`,
        model: 'eleven_multilingual_v2',
      }),
    ),
  );
  assert.equal(expected.length, 226);
  for (const { key, model } of expected) {
    const audio = readFileSync(
      new URL(`../public/audio/${key}.mp3`, import.meta.url),
    );
    const hash = createHash('sha256').update(audio).digest('hex');
    assert.ok(audio.length > 1024, key);
    assert.equal(manifest[key], true, key);
    assert.equal(metadata[key]?.body.model_id, model, key);
    assert.equal(metadata[key]?.audioHash, hash, key);
    assert.equal(versions[key], hash.slice(0, 12), key);
  }
});

test('every teaching event has at least three bilingual variations with no immediate repeats', () => {
  const ids = new Set();
  const picker = createVoicePicker(() => 0.4);
  for (const [event, variants] of Object.entries(lines)) {
    assert.ok(variants.length >= 3, event);
    for (const lang of ['he', 'en']) {
      assert.equal(
        new Set(variants.map((line) => line[lang])).size,
        variants.length,
      );
      let last;
      for (let cycle = 0; cycle < 3; cycle++) {
        const played = new Set();
        for (const line of variants) {
          assert.ok(line[lang]);
          const next = picker(
            `${lang}/${event}`,
            variants.map((variant) => variant.id),
          );
          assert.notEqual(next, last);
          played.add(next);
          last = next;
        }
        assert.equal(played.size, variants.length);
      }
    }
    for (const line of variants) {
      assert.ok(!ids.has(line.id));
      ids.add(line.id);
      for (const lang of ['en', 'he']) {
        const request = speechRequest(line, lang, env);
        assert.equal(request.body.model_id, 'eleven_v3');
        assert.equal(request.body.language_code, lang);
        assert.equal(request.voiceId, lang === 'he' ? 'hebrew' : 'english');
      }
    }
  }
});

test('all 150 examples have unique keys and use consistent English teaching settings regardless of legacy Turbo settings', () => {
  const ids = new Set();
  englishCourse.forEach((level, l) =>
    level.prompts.forEach((prompt, p) => {
      const id = englishExampleId(l, p);
      assert.ok(!ids.has(id));
      ids.add(id);
      const line = { id, en: prompt.en, purpose: 'english-example' };
      const { body, voiceId } = speechRequest(line, 'en', env);
      assert.equal(body.model_id, 'eleven_multilingual_v2');
      assert.equal(body.voice_settings.speed, 0.85);
      assert.equal(body.voice_settings.stability, 0.75);
      assert.equal(voiceId, 'english');
      assert.equal(
        body.text.replace(/[.!?]$/, ''),
        prompt.en.replace(/[.!?]$/, ''),
      );
      assert.throws(() => speechRequest(line, 'he', env), /remain English/);
      assert.equal(
        speechRequest(line, 'en', {
          ...env,
          ELEVENLABS_ENGLISH_LESSON_VOICE_ID: 'teacher',
        }).voiceId,
        'teacher',
      );
    }),
  );
  assert.equal(ids.size, 150);
});

function harness() {
  const clips = [];
  const player = createLessonPlayer((url) => {
    const clip = {
      url,
      paused: false,
      play: async () => {},
      pause() {
        this.paused = true;
      },
    };
    clips.push(clip);
    return clip;
  });
  return { player, clips };
}
test('only playback completion can chain a turn cue; stop and replacement settle as canceled', async () => {
  const { player, clips } = harness();
  const first = player.play('example.mp3');
  const lateEnd = clips[0].onended;
  const second = player.play('instruction.mp3');
  assert.equal(await first, 'canceled');
  assert.ok(clips[0].paused);
  lateEnd();
  clips[1].onended();
  assert.equal(await second, 'ended');
  const third = player.play('example.mp3');
  player.stop();
  assert.equal(await third, 'canceled');
  assert.ok(clips.every((clip) => clip.paused));
});
test('missing files, autoplay rejection, and stalled audio unlock playback without pretending it played', async (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const { player, clips } = harness();
  const failure = player.play('missing.mp3');
  clips[0].onerror();
  assert.equal(await failure, 'failed');
  const stalled = player.play('stalled.mp3');
  context.mock.timers.tick(45000);
  assert.equal(await stalled, 'failed');
  const blocked = createLessonPlayer(() => ({
    pause() {},
    play: async () => {
      throw Error('autoplay blocked');
    },
  }));
  assert.equal(await blocked.play('blocked.mp3'), 'failed');
});

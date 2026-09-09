import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createVoicePicker } from '../lib/voice-picker.ts';
const catalog = JSON.parse(
  readFileSync(new URL('../lib/voice-lines.json', import.meta.url)),
);
test('every spoken event has variations and Mia has fourteen different celebrations', () => {
  const ids = [];
  for (const lines of Object.values(catalog)) {
    assert.ok(lines.length >= 2);
    for (const line of lines) {
      assert.ok(line.en);
      assert.ok(line.he);
      ids.push(line.id);
    }
  }
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(catalog.win.length, 14);
  assert.equal(new Set(catalog.win.map((l) => l.en)).size, 14);
  assert.equal(new Set(catalog.win.map((l) => l.he)).size, 14);
});
test('shuffle bags play all variations and never immediately repeat, even across cycles', () => {
  for (const random of [Math.random, () => 0, () => 0.999]) {
    const pick = createVoicePicker(random);
    for (const [event, lines] of Object.entries(catalog)) {
      const ids = lines.map((l) => l.id);
      let last;
      for (let cycle = 0; cycle < 20; cycle++) {
        const seen = [];
        for (let i = 0; i < ids.length; i++) {
          const next = pick(`en/${event}`, ids);
          assert.notEqual(next, last);
          seen.push(next);
          last = next;
        }
        assert.deepEqual([...seen].sort(), [...ids].sort());
      }
    }
  }
});
test('languages have independent bags; empty and single-clip events are safe', () => {
  const pick = createVoicePicker(() => 0);
  assert.equal(pick('en/hello', ['a', 'b']), pick('he/hello', ['a', 'b']));
  assert.equal(pick('missing', []), undefined);
  assert.equal(pick('single', ['a']), 'a');
  assert.equal(pick('single', ['a']), 'a');
});
test('every variation has a generated recording in both languages', () => {
  const manifest = JSON.parse(
    readFileSync(new URL('../lib/audio-manifest.json', import.meta.url)),
  );
  for (const lang of ['en', 'he'])
    for (const lines of Object.values(catalog))
      for (const line of lines) {
        const key = `${lang}/${line.id}`;
        assert.equal(manifest[key], true, key);
        assert.ok(
          existsSync(new URL(`../public/audio/${key}.mp3`, import.meta.url)),
          key,
        );
      }
});

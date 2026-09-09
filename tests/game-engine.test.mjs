import test from 'node:test';
import assert from 'node:assert/strict';
import {
  makeQuestion,
  makeMemoryDeck,
  shuffle,
  fruit,
} from '../lib/game-engine.ts';
test('all generated rounds contain exactly one correct answer and distinct choices', () => {
  for (let run = 0; run < 100; run++)
    for (const id of ['count', 'colors', 'shapes', 'patterns'])
      for (let round = 0; round < 5; round++) {
        const q = makeQuestion(id, round);
        assert.equal(q.choices.filter((c) => c === q.answer).length, 1);
        assert.equal(new Set(q.choices).size, q.choices.length);
        if (id === 'count') assert.equal(q.answer, q.count);
      }
});
test('patterns continue AB or AAB sequences correctly', () => {
  for (let r = 0; r < 5; r++) {
    const q = makeQuestion('patterns', r);
    const s = [...q.sequence, fruit[q.answer]];
    const period = r < 3 ? 2 : 3;
    for (let i = period; i < s.length; i++) assert.equal(s[i], s[i % period]);
  }
});
test('memory has four complete pairs in every shuffled deck', () => {
  for (let run = 0; run < 100; run++) {
    const d = makeMemoryDeck();
    assert.equal(d.length, 8);
    for (let friend = 0; friend < 4; friend++)
      assert.equal(d.filter((f) => f === friend).length, 2);
  }
});
test('shuffling keeps every number exactly once and leaves input unchanged', () => {
  const a = Array.from({ length: 10 }, (_, i) => i + 1);
  assert.deepEqual(
    shuffle(a).sort((a, b) => a - b),
    a,
  );
  assert.deepEqual(
    a,
    Array.from({ length: 10 }, (_, i) => i + 1),
  );
});

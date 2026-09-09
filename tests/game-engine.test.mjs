import test from 'node:test';
import assert from 'node:assert/strict';
import {
  makeQuestion,
  makeMemoryDeck,
  bubbleOrder,
  countRange,
  memoryPairs,
  levelFor,
  shuffle,
  shapes,
  colors,
  fruit,
  ROUNDS,
} from '../lib/game-engine.ts';
const LEVELS = [0, 1, 2];
const QUIZ = ['count', 'colors', 'shapes', 'patterns'];
test('every round at every level has exactly one correct answer and distinct choices', () => {
  for (let run = 0; run < 200; run++)
    for (const id of QUIZ)
      for (const level of LEVELS)
        for (let round = 0; round < ROUNDS; round++) {
          const q = makeQuestion(id, round, level);
          assert.equal(q.choices.filter((c) => c === q.answer).length, 1);
          assert.equal(new Set(q.choices).size, q.choices.length);
          assert.ok(q.choices.length >= 3);
          if (id === 'count') assert.equal(q.answer, q.count);
        }
});
test('star counts stay inside the level range and grow across rounds', () => {
  for (const level of LEVELS) {
    const [lo, hi] = countRange[level];
    for (let run = 0; run < 100; run++) {
      const first = makeQuestion('count', 0, level).count;
      const last = makeQuestion('count', ROUNDS - 1, level).count;
      assert.ok(first >= lo && first <= hi);
      assert.ok(last >= lo && last <= hi);
      assert.ok(last >= first);
      for (let round = 0; round < ROUNDS; round++) {
        const q = makeQuestion('count', round, level);
        assert.equal(q.scatter.length, q.count);
        for (const c of q.choices) assert.ok(c >= 1);
      }
    }
  }
  assert.equal(makeQuestion('count', 0, 2).choices.length, 4);
  assert.deepEqual(makeQuestion('count', 0, 0).scatter[0], [0, 0, 0]);
});
test('the previous answer is never repeated when avoid is given', () => {
  for (let run = 0; run < 300; run++)
    for (const id of ['count', 'colors', 'shapes']) {
      const prev = makeQuestion(id, 1, 1);
      const next = makeQuestion(id, 2, 1, Math.random, prev.answer);
      assert.notEqual(next.answer, prev.answer);
    }
});
test('color rounds include the look-alike color from level 1 and six choices at level 2', () => {
  for (let run = 0; run < 100; run++) {
    const easy = makeQuestion('colors', run % ROUNDS, 0);
    assert.equal(easy.choices.length, 4);
    const mid = makeQuestion('colors', run % ROUNDS, 1);
    assert.equal(mid.choices.length, 4);
    assert.ok(mid.choices.includes(mid.answer ^ 1));
    const hard = makeQuestion('colors', run % ROUNDS, 2);
    assert.equal(hard.choices.length, 6);
    assert.ok(hard.choices.includes(hard.answer ^ 1));
  }
  assert.equal(colors.length % 2, 0);
});
test('shape rounds add rotation from level 1 and the look-alike shape at level 2', () => {
  for (let run = 0; run < 100; run++) {
    const easy = makeQuestion('shapes', run % ROUNDS, 0);
    assert.equal(easy.choices.length, 3);
    assert.deepEqual(easy.shapeStyle, { rotate: 0, color: -1 });
    const mid = makeQuestion('shapes', run % ROUNDS, 1);
    assert.equal(mid.choices.length, 4);
    assert.notEqual(mid.shapeStyle.rotate, 0);
    assert.ok(
      mid.shapeStyle.color >= 0 && mid.shapeStyle.color < colors.length,
    );
    const hard = makeQuestion('shapes', run % ROUNDS, 2);
    assert.equal(hard.choices.length, 4);
    assert.ok(hard.choices.includes(shapes[hard.answer].lookalike));
  }
  for (const s of shapes) assert.notEqual(s.lookalike, shapes.indexOf(s));
});
test('patterns continue their repeating unit correctly at every level', () => {
  for (let run = 0; run < 200; run++)
    for (const level of LEVELS)
      for (let r = 0; r < ROUNDS; r++) {
        const q = makeQuestion('patterns', r, level);
        const s = [...q.sequence, fruit[q.answer]];
        // Recover the smallest period that explains the shown sequence.
        const period = [2, 3].find((p) =>
          q.sequence.every((v, i) => v === q.sequence[i % p]),
        );
        assert.ok(period, 'sequence has a period of 2 or 3');
        for (let i = period; i < s.length; i++)
          assert.equal(s[i], s[i % period]);
        assert.ok(q.sequence.length >= period * 2 + (level === 0 ? 1 : 0));
        if (level === 0) assert.equal(period, 2);
        if (level === 2) assert.equal(q.choices.length, 4);
      }
});
test('memory decks hold complete pairs for each level', () => {
  for (const level of LEVELS)
    for (let run = 0; run < 100; run++) {
      const d = makeMemoryDeck(level);
      assert.equal(d.length, memoryPairs[level] * 2);
      const counts = {};
      for (const f of d) counts[f] = (counts[f] || 0) + 1;
      for (const n of Object.values(counts)) assert.equal(n, 2);
    }
});
test('bubbles count up on early levels and count down on level 2', () => {
  assert.deepEqual(bubbleOrder(0), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.deepEqual(bubbleOrder(1), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.deepEqual(bubbleOrder(2), [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
});
test('levels follow stars earned and cap at the third star', () => {
  assert.equal(levelFor(undefined), 0);
  assert.equal(levelFor(0), 0);
  assert.equal(levelFor(1), 1);
  assert.equal(levelFor(2), 2);
  assert.equal(levelFor(3), 2);
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
import {
  words,
  sumLimit,
  wordLength,
  makeSequence,
  sequenceLengths,
  sequenceTiles,
} from '../lib/game-engine.ts';
test('rocket sums stay within the level limit and always list the right answer', () => {
  for (const level of LEVELS)
    for (let run = 0; run < 300; run++) {
      const round = run % ROUNDS;
      const q = makeQuestion('sums', round, level);
      const { a, b, op } = q.sum;
      assert.equal(q.answer, op === '+' ? a + b : a - b);
      assert.ok(a >= 1 && b >= 1);
      assert.ok(q.answer >= 1 && q.answer <= sumLimit[level]);
      if (op === '+') assert.ok(a + b <= sumLimit[level]);
      else assert.ok(a <= sumLimit[level]);
      if (level === 0) assert.equal(op, '+');
      assert.equal(q.choices.length, level === 0 ? 3 : 4);
      assert.equal(q.choices.filter((c) => c === q.answer).length, 1);
      assert.equal(new Set(q.choices).size, q.choices.length);
      for (const c of q.choices) assert.ok(c >= 0);
    }
  const both = new Set(
    Array.from({ length: 100 }, () => makeQuestion('sums', 2, 2).sum.op),
  );
  assert.deepEqual([...both].sort(), ['+', '-']);
});
test('space spelling hides one letter of a real word and offers it once', () => {
  for (const lang of ['en', 'he'])
    for (const level of LEVELS)
      for (let run = 0; run < 300; run++) {
        const q = makeQuestion(
          'letters',
          run % ROUNDS,
          level,
          Math.random,
          undefined,
          lang,
        );
        const { text, missing, letters, emoji } = q.word;
        const entry = words.find((w) => w.emoji === emoji);
        assert.equal(entry[lang], text);
        assert.ok([...text].length <= wordLength[level]);
        if (level === 0) assert.equal(missing, 0);
        assert.equal(letters[q.answer], [...text][missing]);
        assert.equal(letters.length, level === 0 ? 3 : 4);
        assert.equal(new Set(letters).size, letters.length);
        assert.deepEqual(
          q.choices,
          letters.map((_, i) => i),
        );
      }
  for (let run = 0; run < 200; run++) {
    const used = [];
    for (let round = 0; round < ROUNDS; round++) {
      const q = makeQuestion('letters', round, 1, Math.random, used);
      const index = words.findIndex((w) => w.emoji === q.word.emoji);
      assert.ok(!used.includes(index), 'no word repeats within a game');
      used.push(index);
    }
  }
});
test('galaxy sequences grow by level and never repeat a planet back to back', () => {
  for (const level of LEVELS)
    for (let round = 0; round < ROUNDS; round++)
      for (let run = 0; run < 50; run++) {
        const steps = makeSequence(level, round);
        assert.equal(steps.length, sequenceLengths[level][round]);
        for (const s of steps) assert.ok(s >= 0 && s < sequenceTiles(level));
        for (let i = 1; i < steps.length; i++)
          assert.notEqual(steps[i], steps[i - 1]);
      }
  assert.ok(sequenceLengths[2][4] > sequenceLengths[0][4]);
});

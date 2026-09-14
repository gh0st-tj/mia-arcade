import test from 'node:test';
import assert from 'node:assert/strict';
import {
  englishCourse,
  ENGLISH_TOTAL,
  englishPosition,
  levelStart,
  matchesSpeech,
  restoreEnglishProgress,
  advanceEnglishProgress,
} from '../lib/english-course.ts';
import {
  createSpeakingSession,
  recognitionConstructor,
} from '../lib/speaking-session.ts';

test('30 bilingual lessons progress from words through phrases to full sentences', () => {
  assert.equal(englishCourse.length, 30);
  assert.equal(ENGLISH_TOTAL, 150);
  assert.deepEqual(
    englishCourse.map((level) => level.stage),
    [
      ...Array(10).fill('words'),
      ...Array(8).fill('phrases'),
      ...Array(12).fill('sentences'),
    ],
  );
  for (const level of englishCourse) {
    assert.ok(level.title.en && level.title.he);
    assert.equal(level.prompts.length, 5);
    assert.equal(new Set(level.prompts.map((prompt) => prompt.en)).size, 5);
    for (const prompt of level.prompts) {
      assert.ok(prompt.en && prompt.he && prompt.emoji);
      assert.ok(matchesSpeech(prompt.en, prompt.en));
      if (level.stage === 'words') assert.equal(prompt.en.split(' ').length, 1);
      if (level.stage === 'sentences')
        assert.ok(prompt.en.split(' ').length >= 3);
    }
  }
});

test('matching requires the entire utterance; harmless transcription formatting is allowed', () => {
  for (const [heard, target] of [
    [' CAT! ', 'cat'],
    ['I see a dog', 'I see a dog.'],
    ['2 cats', 'two cats'],
    ['I’m happy.', 'I am happy.'],
    ['My name’s Mia.', 'My name is Mia.'],
    ['Phish.', 'fish'],
    ['a small phish', 'a small fish'],
  ])
    assert.equal(matchesSpeech(heard, target), true, heard);
  for (const [heard, target] of [
    ['', 'cat'],
    ['dog', 'cat'],
    ['cat dog', 'cat'],
    ['I see', 'I see a dog.'],
    ['I see dog', 'I see a dog.'],
    ['I see a dog and a cat', 'I see a dog.'],
    ['I like apple', 'I like apples.'],
    ['hat', 'cat'],
    ['fist', 'fish'],
    ['wish', 'fish'],
    ['fish dog', 'fish'],
    ['the cat', 'cat'],
    ['I cannot jump', 'I can jump.'],
    ['אני שמחה', 'I am happy.'],
  ])
    assert.equal(matchesSpeech(heard, target), false, heard);
});

test('every saved frontier resumes exactly; replays and locked levels cannot add progress', () => {
  for (let progress = 0; progress < ENGLISH_TOTAL; progress++) {
    const { level, prompt } = englishPosition(progress);
    assert.equal(levelStart(level) + prompt, progress);
    assert.equal(advanceEnglishProgress(progress, level, prompt), progress + 1);
    if (progress > 0) {
      const previous = englishPosition(progress - 1);
      assert.equal(
        advanceEnglishProgress(progress, previous.level, previous.prompt),
        progress,
      );
    }
    const future = englishPosition(progress + 2);
    if (progress < ENGLISH_TOTAL - 2)
      assert.equal(
        advanceEnglishProgress(progress, future.level, future.prompt),
        progress,
      );
  }
  assert.deepEqual(englishPosition(150), { level: 29, prompt: 4 });
  assert.equal(advanceEnglishProgress(150, 29, 4), 150);
  for (const invalid of [null, undefined, {}, '45', Infinity, NaN, -10])
    assert.equal(restoreEnglishProgress(invalid), 0);
  assert.equal(restoreEnglishProgress(99999), 150);
  assert.equal(restoreEnglishProgress(7.9), 7);
});

class FakeRecognition {
  started = 0;
  aborted = 0;
  start() {
    this.started++;
    this.onstart?.();
  }
  abort() {
    this.aborted++;
    this.onend?.();
  }
  result(text, final = true) {
    this.onresult?.({
      resultIndex: 0,
      results: [{ isFinal: final, length: 1, 0: { transcript: text } }],
    });
  }
}
function harness() {
  const recognition = new FakeRecognition();
  const events = [];
  const session = createSpeakingSession(recognition, {
    listening: () => events.push('listening'),
    result: (transcript) => events.push({ transcript }),
    error: (error) => events.push({ error }),
  });
  session.start();
  return { recognition, events, session };
}

test('only final speech yields a result, exactly once, with English recognition', () => {
  const { recognition, events, session } = harness();
  try {
    assert.equal(recognition.lang, 'en-US');
    assert.equal(recognition.maxAlternatives, 5);
    assert.equal(recognition.continuous, false);
    recognition.result('cat', false);
    assert.deepEqual(events, ['listening']);
    const lateCallback = recognition.onresult;
    recognition.result('cat');
    assert.deepEqual(events, ['listening', { transcript: 'cat' }]);
    lateCallback({
      results: [{ isFinal: true, length: 1, 0: { transcript: 'dog' } }],
    });
    assert.equal(events.length, 2);
    assert.equal(recognition.aborted, 1);
  } finally {
    session.cancel();
  }
});

test('stop, unmount, or example playback cancellation prevents late recognition from advancing', () => {
  const { recognition, events, session } = harness();
  const lateResult = recognition.onresult;
  const lateError = recognition.onerror;
  session.cancel();
  lateResult({
    results: [{ isFinal: true, length: 1, 0: { transcript: 'cat' } }],
  });
  lateError({ error: 'aborted' });
  assert.deepEqual(events, ['listening']);
  assert.equal(recognition.onresult, null);
});

test('final alternative fish is retained when the first guess is wrong', () => {
  const recognition = new FakeRecognition();
  const answers = [];
  const session = createSpeakingSession(recognition, {
    listening() {},
    result: (transcript, alternatives) => answers.push({ transcript, alternatives }),
    error: (error) => assert.fail(error),
  });
  session.start();
  const result = {
    isFinal: false, length: 3,
    0: { transcript: 'Fist.' },
    1: { transcript: 'Fish.' },
    2: { transcript: 'Phish.' },
  };
  recognition.onresult({ resultIndex: 0, results: [result] });
  assert.equal(answers.length, 0);
  recognition.onresult({ resultIndex: 0, results: [{ ...result, isFinal: true }] });
  assert.deepEqual(answers, [{ transcript: 'Fist.', alternatives: ['Fist.', 'Fish.', 'Phish.'] }]);
  assert.ok(answers[0].alternatives.some((text) => matchesSpeech(text, 'fish')));
  assert.equal(answers[0].alternatives.some((text) => matchesSpeech(text, 'dog')), false);
  session.cancel();
});

test('alternatives retain all final sentence segments and cannot pass a partial answer', () => {
  const recognition = new FakeRecognition();
  let candidates;
  const session = createSpeakingSession(recognition, {
    listening() {},
    result: (_transcript, alternatives) => { candidates = alternatives; },
    error: (error) => assert.fail(error),
  });
  session.start();
  recognition.onresult({ resultIndex: 0, results: [
    { isFinal: true, length: 1, 0: { transcript: 'a small' } },
    { isFinal: true, length: 2, 0: { transcript: 'fist' }, 1: { transcript: 'fish' } },
  ] });
  assert.deepEqual(candidates, ['a small fist', 'a small fish']);
  assert.ok(candidates.some((text) => matchesSpeech(text, 'a small fish')));
  assert.equal(candidates.some((text) => matchesSpeech(text, 'fish')), false);
  session.cancel();
});

test('permission denial, network failure, silence and empty transcripts never yield answers', () => {
  for (const reason of [
    'not-allowed',
    'service-not-allowed',
    'network',
    'audio-capture',
  ]) {
    const { recognition, events, session } = harness();
    recognition.onerror({ error: reason });
    assert.deepEqual(events, ['listening', { error: reason }]);
    session.cancel();
  }
  for (const emptyResult of [false, true]) {
    const { recognition, events, session } = harness();
    if (emptyResult) recognition.result(' ');
    else recognition.onend();
    assert.deepEqual(events, ['listening', { error: 'no-speech' }]);
    session.cancel();
  }
  assert.equal(recognitionConstructor(), undefined); // Server rendering has no microphone.
});

test('silent sessions time out and start failures remain recoverable', (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] });
  const { events, session } = harness();
  context.mock.timers.tick(20000);
  assert.deepEqual(events, ['listening', { error: 'no-speech' }]);
  session.cancel();
  const recognition = new FakeRecognition();
  recognition.start = () => {
    throw new Error('unavailable');
  };
  const failures = [];
  const failed = createSpeakingSession(recognition, {
    listening() {},
    result() {
      assert.fail('No answer expected');
    },
    error: (error) => failures.push(error),
  });
  failed.start();
  assert.deepEqual(failures, ['start-failed']);
  failed.cancel();
});

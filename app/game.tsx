'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Rocket, Star } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  colors,
  shapes,
  friends,
  fruit,
  fruitNames,
  makeQuestion,
  makeMemoryDeck,
  bubbleOrder,
  words,
  shuffle,
  ROUNDS,
  type Level,
  type Question,
} from '@/lib/game-engine';
import type { Lang, GameId } from '@/lib/game-data';
type Props = {
  id: GameId;
  lang: Lang;
  level: Level;
  /** `perfect` is true when every answer was right on the first try. */
  onWin: (perfect: boolean) => void;
  speak: (key: string, text: string) => void;
  sound: boolean;
};

const wordIndex = (q: Question) =>
  words.findIndex((w) => w.emoji === q.word?.emoji);

export default function Game({ id, lang, level, onWin, speak, sound }: Props) {
  const t = (en: string, he: string) => (lang === 'en' ? en : he);
  const [round, setRound] = useState(0);
  const [question, setQuestion] = useState(() =>
    makeQuestion(id, 0, level, Math.random, undefined, lang),
  );
  /** Word indices already shown in this Space Spelling game. */
  const [usedWords, setUsedWords] = useState(() => [wordIndex(question)]);
  const [feedback, setFeedback] = useState<'correct' | 'retry' | null>(null);
  const [wrong, setWrong] = useState<number | null>(null);
  const [missed, setMissed] = useState<number[]>([]);
  const [misses, setMisses] = useState(0);
  const [perfectRounds, setPerfectRounds] = useState(0);
  const [counted, setCounted] = useState<number[]>([]);
  const [deck] = useState(() => makeMemoryDeck(level));
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const order = bubbleOrder(level);
  const [bubbles, setBubbles] = useState(() => shuffle(order));
  const [popped, setPopped] = useState<number[]>([]);
  const [done, setDone] = useState(false);
  const lock = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
      void audioContext.current?.close();
    },
    [],
  );
  const chime = () => {
    if (!sound) return;
    try {
      const ctx = audioContext.current ?? new AudioContext();
      audioContext.current = ctx;
      void ctx.resume();
      [523.25, 659.25, 783.99].forEach((f, i) => {
        const o = ctx.createOscillator(),
          g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = f;
        g.gain.setValueAtTime(0, ctx.currentTime + i * 0.08);
        g.gain.linearRampToValueAtTime(
          0.075,
          ctx.currentTime + i * 0.08 + 0.01,
        );
        g.gain.exponentialRampToValueAtTime(
          0.001,
          ctx.currentTime + i * 0.08 + 0.22,
        );
        o.connect(g);
        g.connect(ctx.destination);
        o.start(ctx.currentTime + i * 0.08);
        o.stop(ctx.currentTime + i * 0.08 + 0.23);
      });
    } catch {}
  };
  const retry = (value: number) => {
    setWrong(value);
    setMissed((m) => (m.includes(value) ? m : [...m, value]));
    setMisses((m) => m + 1);
    setFeedback('retry');
    speak(
      'retry',
      t('Let’s try another one. You can do it!', 'בואי ננסה שוב. את יכולה!'),
    );
  };
  const firstTry = missed.length === 0;
  const answer = (value: number) => {
    if (lock.current) return;
    if (value !== question.answer) {
      retry(value);
      return;
    }
    lock.current = true;
    if (missed.length === 0) setPerfectRounds((p) => p + 1);
    setFeedback('correct');
    setWrong(null);
    chime();
    speak('correct', t('That’s it, Mia!', 'בדיוק, מיה!'));
  };
  const next = () => {
    if (round === ROUNDS - 1) {
      onWin(perfectRounds === ROUNDS);
      return;
    }
    const r = round + 1;
    setRound(r);
    const q = makeQuestion(
      id,
      r,
      level,
      Math.random,
      id === 'letters' ? usedWords : question.answer,
      lang,
    );
    setQuestion(q);
    setUsedWords([...usedWords, wordIndex(q)]);
    setFeedback(null);
    setWrong(null);
    setMissed([]);
    setCounted([]);
    lock.current = false;
  };
  const pairs = deck.length / 2;
  const flip = (index: number) => {
    if (lock.current || open.includes(index) || matched.includes(index)) return;
    setFeedback(null);
    const turned = [...open, index];
    setOpen(turned);
    if (turned.length === 2) {
      lock.current = true;
      if (deck[turned[0]] === deck[index]) {
        chime();
        speak('match', t('A matching pair!', 'זוג תואם!'));
        const found = [...matched, ...turned];
        setMatched(found);
        setFeedback('correct');
        timer.current = setTimeout(() => {
          setOpen([]);
          lock.current = false;
          setFeedback(null);
          if (found.length === deck.length) setDone(true);
        }, 600);
      } else {
        setMisses((m) => m + 1);
        setFeedback('retry');
        speak(
          'memory-retry',
          t('Let’s look for another pair.', 'בואי נחפש זוג אחר.'),
        );
        timer.current = setTimeout(() => {
          setOpen([]);
          lock.current = false;
          setFeedback(null);
        }, 1300);
      }
    }
  };
  const nextBubble = order[popped.length];
  const pop = (n: number) => {
    if (lock.current || popped.includes(n)) return;
    if (n !== nextBubble) {
      retry(n);
      return;
    }
    setWrong(null);
    setFeedback(null);
    speak(`number-${n}`, String(n));
    const nowPopped = [...popped, n];
    setPopped(nowPopped);
    // From the second star on, the bubbles drift to new spots after each pop.
    if (level > 0 && nowPopped.length < order.length)
      setBubbles(shuffle(order));
    if (nowPopped.length === order.length) {
      lock.current = true;
      chime();
      setDone(true);
    }
  };
  const countdown = id === 'bubbles' && level === 2;
  const progress =
    id === 'memory'
      ? (matched.length / deck.length) * 100
      : id === 'bubbles'
        ? (popped.length / order.length) * 100
        : ((round + (feedback === 'correct' ? 1 : 0)) / ROUNDS) * 100;
  const successText =
    feedback === 'correct' && firstTry && id !== 'memory'
      ? t('First try! Superstar!', 'בפעם הראשונה! כוכבת!')
      : t('That’s it, Mia!', 'בדיוק, מיה!');
  const retryText =
    id === 'memory'
      ? t('Two new friends! Try another pair.', 'שני חברים חדשים! נסי זוג אחר.')
      : t('Nearly! Take another look.', 'כמעט! הסתכלי שוב.');
  const levelLabel = t(`Level ${level + 1}`, `שלב ${level + 1}`);
  return (
    <div className={`game-board board-${id} level-${level}`}>
      <div className="round-progress">
        <span>
          {id === 'memory'
            ? t(
                `${matched.length / 2} of ${pairs} pairs`,
                `${matched.length / 2} מתוך ${pairs} זוגות`,
              )
            : id === 'bubbles'
              ? t(
                  `${popped.length} of ${order.length} bubbles`,
                  `${popped.length} מתוך ${order.length} בועות`,
                )
              : t(
                  `Adventure ${round + 1} of ${ROUNDS}`,
                  `הרפתקה ${round + 1} מתוך ${ROUNDS}`,
                )}
        </span>
        <Progress
          value={progress}
          aria-label={t('Game progress', 'התקדמות במשחק')}
        />
        <span
          className="level-badge"
          aria-label={levelLabel}
          title={levelLabel}
        >
          {Array.from({ length: level + 1 }, (_, i) => (
            <Star key={i} size={13} fill="currentColor" />
          ))}
        </span>
      </div>
      {id === 'memory' ? (
        <>
          <div className={`memory-grid pairs-${pairs}`}>
            {deck.map((f, i) => {
              const shown = open.includes(i) || matched.includes(i);
              return (
                <button
                  key={i}
                  className={`memory-tile ${shown ? 'face-up' : ''} ${matched.includes(i) ? 'matched' : ''}`}
                  onClick={() => flip(i)}
                  disabled={matched.includes(i)}
                  aria-label={
                    shown
                      ? `${friends[f][lang]}${matched.includes(i) ? t(', matched', ', זוג נמצא') : ''}`
                      : t(`Turn over card ${i + 1}`, `הפכי קלף ${i + 1}`)
                  }
                >
                  <span aria-hidden="true">
                    {shown ? friends[f].value : '✦'}
                  </span>
                  {shown && <small>{friends[f][lang]}</small>}
                  {matched.includes(i) && (
                    <Check className="match-check" size={18} />
                  )}
                </button>
              );
            })}
          </div>
        </>
      ) : id === 'bubbles' ? (
        <>
          <h2 className="bubble-instruction">
            {done ? (
              countdown ? (
                <>
                  {t('Blast off!', 'המראה!')} <Rocket className="rocket" />
                </>
              ) : (
                t('All popped!', 'כולן התפוצצו!')
              )
            ) : (
              <>
                {countdown
                  ? t('Countdown! Find number', 'ספירה לאחור! מצאי את המספר')
                  : t('Find number', 'מצאי את המספר')}{' '}
                <b>{nextBubble}</b>
              </>
            )}
          </h2>
          {countdown && !done && (
            <p className="bubble-hint">
              {t(
                'Pop from ten down to one to launch the rocket.',
                'פוצצי מעשר עד אחת כדי לשגר את הרקטה.',
              )}
            </p>
          )}
          <div className={`bubbles-grid ${level > 0 ? 'drifting' : ''}`}>
            {bubbles.map((n, i) => (
              <button
                key={n}
                style={
                  {
                    '--bubble-color': [
                      '#d3a1f2',
                      '#89e3c4',
                      '#f5b2d1',
                      '#97c5ff',
                      '#f6d382',
                    ][i % 5],
                  } as React.CSSProperties
                }
                className={`bubble ${popped.includes(n) ? 'popped' : ''} ${wrong === n ? 'try-again' : ''}`}
                disabled={popped.includes(n)}
                onClick={() => pop(n)}
                aria-label={t(`Pop ${n}`, `פוצצי ${n}`)}
              >
                {popped.includes(n) ? <Check size={26} /> : n}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="question-surface" key={round}>
            {id === 'count' ? (
              <>
                <div className="counting-stars">
                  {Array.from({ length: question.count! }, (_, i) => {
                    const [dx, dy, rot] = question.scatter?.[i] ?? [0, 0, 0];
                    return (
                      <button
                        className={counted.includes(i) ? 'counted' : ''}
                        key={i}
                        style={{
                          transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg)`,
                        }}
                        onClick={() => {
                          if (counted.includes(i)) return;
                          setCounted((c) => [...c, i]);
                          speak(
                            `number-${counted.length + 1}`,
                            String(counted.length + 1),
                          );
                        }}
                        aria-label={t(
                          `Count star ${i + 1}`,
                          `ספרי כוכב ${i + 1}`,
                        )}
                      >
                        ⭐
                        {counted.includes(i) && (
                          <small>{counted.indexOf(i) + 1}</small>
                        )}
                      </button>
                    );
                  })}
                </div>
                <p>{t('How many stars can you see?', 'כמה כוכבים את רואה?')}</p>
                <span className="count-hint">
                  {t(
                    'You can tap each star to count along.',
                    'אפשר ללחוץ על כל כוכב ולספור יחד.',
                  )}
                </span>
              </>
            ) : id === 'colors' ? (
              <>
                <div
                  className="color-target"
                  style={{ background: colors[question.color!].value }}
                />
                <p>{t('Find the same color', 'מצאי את אותו הצבע')}</p>
                {level > 0 && (
                  <span className="count-hint">
                    {t(
                      'Careful, some colors are close cousins!',
                      'שימי לב, יש צבעים שדומים מאוד!',
                    )}
                  </span>
                )}
              </>
            ) : id === 'shapes' ? (
              <>
                <span className="dean-hint">
                  👶 {t('Let’s find a toy for Dean', 'בואי נמצא צעצוע לדין')}
                </span>
                <div
                  className="shape-target"
                  style={{
                    transform: `rotate(${question.shapeStyle?.rotate ?? 0}deg)`,
                    color:
                      question.shapeStyle && question.shapeStyle.color >= 0
                        ? colors[question.shapeStyle.color].value
                        : undefined,
                  }}
                >
                  {shapes[question.shape!].value}
                </div>
                <p>{t('Which shape is the same?', 'איזו צורה זהה?')}</p>
              </>
            ) : id === 'sums' ? (
              <>
                <div className="sum-row" dir="ltr">
                  <b>{question.sum!.a}</b>
                  <span>{question.sum!.op === '+' ? '+' : '−'}</span>
                  <b>{question.sum!.b}</b>
                  <span>=</span>
                  <span className="missing-pattern">?</span>
                </div>
                {level < 2 && (
                  <div className="sum-stars" dir="ltr" aria-hidden="true">
                    {question.sum!.op === '+' ? (
                      <>
                        <span>{'⭐'.repeat(question.sum!.a)}</span>
                        <i>+</i>
                        <span>{'⭐'.repeat(question.sum!.b)}</span>
                      </>
                    ) : (
                      <span>
                        {'⭐'.repeat(question.sum!.a - question.sum!.b)}
                        <s>{'⭐'.repeat(question.sum!.b)}</s>
                      </span>
                    )}
                  </div>
                )}
                <p>
                  {question.sum!.op === '+'
                    ? t('How many altogether?', 'כמה יש ביחד?')
                    : t('How many are left?', 'כמה נשארו?')}
                </p>
              </>
            ) : id === 'letters' ? (
              <>
                <div className="word-picture" aria-hidden="true">
                  {question.word!.emoji}
                </div>
                <div
                  className="word-row"
                  aria-label={t(
                    `The word with a missing letter ${question.word!.missing + 1}`,
                    `המילה עם אות חסרה ${question.word!.missing + 1}`,
                  )}
                >
                  {question.word!.text.split('').map((ch, i) => (
                    <span
                      key={i}
                      className={
                        i === question.word!.missing ? 'letter-blank' : 'letter'
                      }
                    >
                      {i === question.word!.missing ? '?' : ch}
                    </span>
                  ))}
                </div>
                <p>{t('Which letter is missing?', 'איזו אות חסרה?')}</p>
              </>
            ) : (
              <>
                <div
                  className={`pattern-row ${question.sequence!.length > 6 ? 'long' : ''}`}
                >
                  {question.sequence!.map((f, i) => (
                    <span key={i}>{f}</span>
                  ))}
                  <span className="missing-pattern">?</span>
                </div>
                <p>{t('What comes next?', 'מה מגיע עכשיו?')}</p>
              </>
            )}
          </div>
          <div
            className={`answer-options ${id === 'colors' ? 'color-options' : ''} choices-${question.choices.length}`}
          >
            {question.choices.map((value) => (
              <button
                key={value}
                className={`answer-tile ${feedback === 'correct' && value === question.answer ? 'answer-correct' : ''} ${wrong === value ? 'try-again' : ''} ${missed.includes(value) ? 'missed' : ''}`}
                onClick={() => answer(value)}
                disabled={feedback === 'correct'}
                aria-label={
                  id === 'colors'
                    ? colors[value][lang]
                    : id === 'shapes'
                      ? shapes[value][lang]
                      : id === 'patterns'
                        ? fruitNames[lang][value]
                        : id === 'letters'
                          ? question.word!.letters[value]
                          : String(value)
                }
              >
                {id === 'colors' ? (
                  <>
                    <span
                      className="paint-swatch"
                      style={{ background: colors[value].value }}
                    />
                    <small>{colors[value][lang]}</small>
                  </>
                ) : id === 'shapes' ? (
                  <>
                    <span
                      className="shape-option"
                      style={{
                        color: colors[(value + 2) % colors.length].value,
                      }}
                    >
                      {shapes[value].value}
                    </span>
                    <small>{shapes[value][lang]}</small>
                  </>
                ) : id === 'patterns' ? (
                  <span className="fruit-option">{fruit[value]}</span>
                ) : id === 'letters' ? (
                  <span className="letter-option">
                    {question.word!.letters[value]}
                  </span>
                ) : (
                  value
                )}
              </button>
            ))}
          </div>
        </>
      )}
      <output
        className={`game-feedback ${feedback === 'correct' ? 'good' : ''}`}
        aria-live="polite"
      >
        {feedback === 'correct' ? (
          <>
            <Check size={20} />
            {successText}
          </>
        ) : feedback === 'retry' ? (
          retryText
        ) : (
          <span>
            {t('Take your time. You’ve got this.', 'בקצב שלך. את יכולה.')}
          </span>
        )}
      </output>
      {id !== 'memory' && id !== 'bubbles' && feedback === 'correct' && (
        <button className="primary-button next-button" onClick={next}>
          {round === ROUNDS - 1
            ? t('Collect my star', 'לאסוף את הכוכב שלי')
            : t('Next one!', 'הבא!')}
          <ArrowRight size={19} />
        </button>
      )}
      {done && (
        <button
          className="primary-button next-button"
          onClick={() => onWin(id === 'memory' ? misses < pairs : misses === 0)}
        >
          <Star size={20} />
          {t('Collect my star', 'לאסוף את הכוכב שלי')}
        </button>
      )}
    </div>
  );
}

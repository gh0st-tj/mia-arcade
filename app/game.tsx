'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Star } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  colors,
  shapes,
  friends,
  fruit,
  fruitNames,
  makeQuestion,
  makeMemoryDeck,
  shuffle,
} from '@/lib/game-engine';
import type { Lang, GameId } from '@/lib/game-data';
type Props = {
  id: GameId;
  lang: Lang;
  onWin: () => void;
  speak: (key: string, text: string) => void;
  sound: boolean;
};

export default function Game({ id, lang, onWin, speak, sound }: Props) {
  const t = (en: string, he: string) => (lang === 'en' ? en : he);
  const [round, setRound] = useState(0);
  const [question, setQuestion] = useState(() => makeQuestion(id, 0));
  const [feedback, setFeedback] = useState<'correct' | 'retry' | null>(null);
  const [wrong, setWrong] = useState<number | null>(null);
  const [counted, setCounted] = useState<number[]>([]);
  const [deck] = useState(makeMemoryDeck);
  const [open, setOpen] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [bubbles] = useState(() =>
    shuffle(Array.from({ length: 10 }, (_, i) => i + 1)),
  );
  const [nextBubble, setNextBubble] = useState(1);
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
    setFeedback('retry');
    speak(
      'retry',
      t('Let’s try another one. You can do it!', 'בואי ננסה שוב. את יכולה!'),
    );
  };
  const answer = (value: number) => {
    if (lock.current) return;
    if (value !== question.answer) {
      retry(value);
      return;
    }
    lock.current = true;
    setFeedback('correct');
    setWrong(null);
    chime();
  };
  const next = () => {
    if (round === 4) {
      onWin();
      return;
    }
    const r = round + 1;
    setRound(r);
    setQuestion(makeQuestion(id, r));
    setFeedback(null);
    setWrong(null);
    setCounted([]);
    lock.current = false;
  };
  const flip = (index: number) => {
    if (lock.current || open.includes(index) || matched.includes(index)) return;
    setFeedback(null);
    const turned = [...open, index];
    setOpen(turned);
    if (turned.length === 2) {
      lock.current = true;
      if (deck[turned[0]] === deck[index]) {
        chime();
        const pairs = [...matched, ...turned];
        setMatched(pairs);
        setFeedback('correct');
        timer.current = setTimeout(() => {
          setOpen([]);
          lock.current = false;
          setFeedback(null);
          if (pairs.length === 8) setDone(true);
        }, 600);
      } else {
        setFeedback('retry');
        timer.current = setTimeout(() => {
          setOpen([]);
          lock.current = false;
          setFeedback(null);
        }, 1300);
      }
    }
  };
  const pop = (n: number) => {
    if (lock.current || n < nextBubble) return;
    if (n !== nextBubble) {
      retry(n);
      return;
    }
    setWrong(null);
    setFeedback(null);
    speak(`number-${n}`, String(n));
    setNextBubble(n + 1);
    if (n === 10) {
      lock.current = true;
      setDone(true);
    }
  };
  const progress =
    id === 'memory'
      ? (matched.length / 8) * 100
      : id === 'bubbles'
        ? (nextBubble - 1) * 10
        : ((round + (feedback === 'correct' ? 1 : 0)) / 5) * 100;
  const successText = t('That’s it, Mia!', 'בדיוק, מיה!');
  const retryText =
    id === 'memory'
      ? t('Two new friends! Try another pair.', 'שני חברים חדשים! נסי זוג אחר.')
      : t('Nearly! Take another look.', 'כמעט! הסתכלי שוב.');
  return (
    <div className={`game-board board-${id}`}>
      <div className="round-progress">
        <span>
          {id === 'memory'
            ? t(
                `${matched.length / 2} of 4 pairs`,
                `${matched.length / 2} מתוך 4 זוגות`,
              )
            : id === 'bubbles'
              ? t(
                  `${nextBubble - 1} of 10 bubbles`,
                  `${nextBubble - 1} מתוך 10 בועות`,
                )
              : t(`Adventure ${round + 1} of 5`, `הרפתקה ${round + 1} מתוך 5`)}
        </span>
        <Progress
          value={progress}
          aria-label={t('Game progress', 'התקדמות במשחק')}
        />
        <Star size={18} />
      </div>
      {id === 'memory' ? (
        <>
          <div className="memory-grid">
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
              t('All popped!', 'כולן התפוצצו!')
            ) : (
              <>
                {t('Find number', 'מצאי את המספר')} <b>{nextBubble}</b>
              </>
            )}
          </h2>
          <div className="bubbles-grid">
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
                className={`bubble ${n < nextBubble ? 'popped' : ''} ${wrong === n ? 'try-again' : ''}`}
                disabled={n < nextBubble}
                onClick={() => pop(n)}
                aria-label={t(`Pop ${n}`, `פוצצי ${n}`)}
              >
                {n < nextBubble ? <Check size={26} /> : n}
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
                  {Array.from({ length: question.count! }, (_, i) => (
                    <button
                      className={counted.includes(i) ? 'counted' : ''}
                      key={i}
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
                  ))}
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
              </>
            ) : id === 'shapes' ? (
              <>
                <span className="dean-hint">
                  👶 {t('Let’s find a toy for Dean', 'בואי נמצא צעצוע לדין')}
                </span>
                <div className="shape-target">
                  {shapes[question.shape!].value}
                </div>
                <p>{t('Which shape is the same?', 'איזו צורה זהה?')}</p>
              </>
            ) : (
              <>
                <div className="pattern-row">
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
            className={`answer-options ${id === 'colors' ? 'color-options' : ''}`}
          >
            {question.choices.map((value) => (
              <button
                key={value}
                className={`answer-tile ${feedback === 'correct' && value === question.answer ? 'answer-correct' : ''} ${wrong === value ? 'try-again' : ''}`}
                onClick={() => answer(value)}
                disabled={feedback === 'correct'}
                aria-label={
                  id === 'colors'
                    ? colors[value][lang]
                    : id === 'shapes'
                      ? shapes[value][lang]
                      : id === 'patterns'
                        ? fruitNames[lang][value]
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
                      style={{ color: colors[(value + 2) % 6].value }}
                    >
                      {shapes[value].value}
                    </span>
                    <small>{shapes[value][lang]}</small>
                  </>
                ) : id === 'patterns' ? (
                  <span className="fruit-option">{fruit[value]}</span>
                ) : (
                  value
                )}
              </button>
            ))}
          </div>
        </>
      )}
      <div
        className={`game-feedback ${feedback === 'correct' ? 'good' : ''}`}
        role="status"
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
      </div>
      {id !== 'memory' && id !== 'bubbles' && feedback === 'correct' && (
        <button className="primary-button next-button" onClick={next}>
          {round === 4
            ? t('Collect my star', 'לאסוף את הכוכב שלי')
            : t('Next one!', 'הבא!')}
          <ArrowRight size={19} />
        </button>
      )}
      {done && (
        <button className="primary-button next-button" onClick={onWin}>
          <Star size={20} />
          {t('Collect my star', 'לאסוף את הכוכב שלי')}
        </button>
      )}
    </div>
  );
}

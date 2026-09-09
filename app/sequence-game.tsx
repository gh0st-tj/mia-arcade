'use client';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { ArrowRight, Check, Eye, Star } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  makeSequence,
  sequenceTiles,
  ROUNDS,
  type Level,
} from '@/lib/game-engine';
import type { Lang } from '@/lib/game-data';

/** The planets on the board; each lights up with its own tone. */
const planets = [
  { emoji: '🪐', color: '#ffd66b', tone: 392 },
  { emoji: '🌍', color: '#7fd0ff', tone: 440 },
  { emoji: '🌕', color: '#e6d9ff', tone: 494 },
  { emoji: '☀️', color: '#ffb36b', tone: 523 },
  { emoji: '⭐', color: '#fff29b', tone: 587 },
  { emoji: '🚀', color: '#ff9db3', tone: 659 },
];
const SHOW_MS = 650;
const GAP_MS = 250;
const LEAD_MS = 400;
function playTone(
  context: RefObject<AudioContext | null>,
  frequency: number,
  duration: number,
) {
  try {
    const ctx = context.current ?? new AudioContext();
    context.current = ctx;
    void ctx.resume();
    const o = ctx.createOscillator(),
      g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.value = frequency;
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + duration + 0.02);
  } catch {}
}
type Props = {
  lang: Lang;
  level: Level;
  onWin: (perfect: boolean) => void;
  speak: (key: string, text: string) => void;
  sound: boolean;
};

export default function SequenceGame({
  lang,
  level,
  onWin,
  speak,
  sound,
}: Props) {
  const t = (en: string, he: string) => (lang === 'en' ? en : he);
  const [round, setRound] = useState(0);
  const [steps, setSteps] = useState(() => makeSequence(level, 0));
  /** Bumped whenever the sequence should be shown again. */
  const [showing, setShowing] = useState(0);
  const [phase, setPhase] = useState<'watch' | 'play' | 'correct'>('watch');
  const [lit, setLit] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [feedback, setFeedback] = useState<'retry' | null>(null);
  const [wrong, setWrong] = useState<number | null>(null);
  const [roundMissed, setRoundMissed] = useState(false);
  const [perfectRounds, setPerfectRounds] = useState(0);
  const tapTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const audioContext = useRef<AudioContext | null>(null);
  const soundOn = useRef(sound);
  const tiles = sequenceTiles(level);
  useEffect(() => {
    soundOn.current = sound;
  }, [sound]);
  useEffect(
    () => () => {
      tapTimers.current.forEach(clearTimeout);
      void audioContext.current?.close();
    },
    [],
  );
  // Plays the sequence for the child, then hands over the board. Every timer
  // is cancelled if the round changes or the game unmounts mid-show.
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
    at(0, () => {
      setPhase('watch');
      setLit(null);
      setProgress(0);
      setWrong(null);
    });
    steps.forEach((tile, i) => {
      const start = LEAD_MS + i * (SHOW_MS + GAP_MS);
      at(start, () => {
        setLit(tile);
        if (soundOn.current) playTone(audioContext, planets[tile].tone, 0.28);
      });
      at(start + SHOW_MS, () => setLit(null));
    });
    at(LEAD_MS + steps.length * (SHOW_MS + GAP_MS), () => setPhase('play'));
    return () => timers.forEach(clearTimeout);
  }, [steps, showing]);
  const later = (fn: () => void, ms: number) =>
    tapTimers.current.push(setTimeout(fn, ms));
  const tone = (frequency: number, duration: number) => {
    if (sound) playTone(audioContext, frequency, duration);
  };
  const tap = (tile: number) => {
    if (phase !== 'play') return;
    setLit(tile);
    tone(planets[tile].tone, 0.2);
    later(() => setLit(null), 220);
    if (tile !== steps[progress]) {
      setWrong(tile);
      setFeedback('retry');
      setRoundMissed(true);
      setPhase('watch');
      speak(
        'retry',
        t('Let’s watch it again. You can do it!', 'בואי נראה שוב. את יכולה!'),
      );
      later(() => {
        setFeedback(null);
        setShowing((n) => n + 1);
      }, 1100);
      return;
    }
    const done = progress + 1;
    setProgress(done);
    if (done === steps.length) {
      setPhase('correct');
      if (!roundMissed) setPerfectRounds((p) => p + 1);
      [523.25, 659.25, 783.99].forEach((f, i) =>
        later(() => tone(f, 0.25), 250 + i * 90),
      );
    }
  };
  const next = () => {
    if (round === ROUNDS - 1) {
      onWin(perfectRounds === ROUNDS);
      return;
    }
    const r = round + 1;
    setRound(r);
    setRoundMissed(false);
    setFeedback(null);
    setSteps(makeSequence(level, r));
  };
  const levelLabel = t(`Level ${level + 1}`, `שלב ${level + 1}`);
  return (
    <div className={`game-board board-sequence level-${level}`}>
      <div className="round-progress">
        <span>
          {t(
            `Adventure ${round + 1} of ${ROUNDS}`,
            `הרפתקה ${round + 1} מתוך ${ROUNDS}`,
          )}
        </span>
        <Progress
          value={((round + (phase === 'correct' ? 1 : 0)) / ROUNDS) * 100}
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
      <h2 className={`sequence-status ${phase}`}>
        {phase === 'watch'
          ? t('Watch closely…', 'הסתכלי טוב…')
          : phase === 'play'
            ? t('Your turn! Tap them in order.', 'תורך! לחצי לפי הסדר.')
            : t('You remembered every one!', 'זכרת את כולם!')}
      </h2>
      <div className="sequence-dots" aria-hidden="true">
        {steps.map((_, i) => (
          <i key={i} className={i < progress ? 'done' : ''} />
        ))}
      </div>
      <div
        className={`sequence-grid tiles-${tiles} ${phase}`}
        data-steps={steps.join(',')}
        data-tiles={tiles}
      >
        {planets.slice(0, tiles).map((p, i) => (
          <button
            key={i}
            className={`planet-tile ${lit === i ? 'lit' : ''} ${wrong === i ? 'try-again' : ''}`}
            style={{ '--planet-color': p.color } as React.CSSProperties}
            onClick={() => tap(i)}
            disabled={phase !== 'play'}
            aria-label={t(`Planet ${i + 1}`, `כוכב לכת ${i + 1}`)}
          >
            <span aria-hidden="true">{p.emoji}</span>
          </button>
        ))}
      </div>
      <div
        className={`game-feedback ${phase === 'correct' ? 'good' : ''}`}
        role="status"
        aria-live="polite"
      >
        {phase === 'correct' ? (
          <>
            <Check size={20} />
            {roundMissed
              ? t('That’s it, Mia!', 'בדיוק, מיה!')
              : t('First try! Superstar!', 'בפעם הראשונה! כוכבת!')}
          </>
        ) : feedback === 'retry' ? (
          t('Nearly! Watch it once more.', 'כמעט! הסתכלי עוד פעם.')
        ) : (
          <span>
            {t(
              `${steps.length} planets this time. Take your time.`,
              `${steps.length} כוכבי לכת הפעם. בקצב שלך.`,
            )}
          </span>
        )}
      </div>
      {phase === 'play' && (
        <button
          className="secondary-button replay-button"
          onClick={() => setShowing((n) => n + 1)}
        >
          <Eye size={18} />
          {t('Show me again', 'תראה לי שוב')}
        </button>
      )}
      {phase === 'correct' && (
        <button className="primary-button next-button" onClick={next}>
          {round === ROUNDS - 1
            ? t('Collect my star', 'לאסוף את הכוכב שלי')
            : t('Next one!', 'הבא!')}
          <ArrowRight size={19} />
        </button>
      )}
    </div>
  );
}

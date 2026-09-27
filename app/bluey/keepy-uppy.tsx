'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, RotateCcw, Star } from 'lucide-react';
import type { Lang } from '@/lib/game-data';
import {
  BALLOON_R,
  FLOOR,
  KEEPY_PER_WORLD,
  KH,
  KSTEP,
  KW,
  activeTarget,
  bopAt,
  createKeepy,
  keepyLevels,
  keepyStars,
  keepyWorlds,
  stepKeepy,
  windAt,
  type KPoint,
  type KeepyLevel,
  type KeepySim,
  type KeepyTip,
} from '@/lib/keepy-uppy';
import {
  arcadeStars,
  loadLevels,
  recordLevel,
  saveLevels,
} from '@/lib/bluey-progress';
import {
  bingo,
  bluey,
  drawBalloon,
  drawLounge,
  drawPup,
  drawStar,
} from './draw';
import { play, unlockAudio } from './sfx';
import { BlueyScreen, LevelMap, PupPortrait, ResultCard } from './shell';

type Speak = (key: string, text: string) => void;
type Props = {
  lang: Lang;
  sound: boolean;
  speak: Speak;
  onStars: (count: number) => void;
  onExit: () => void;
};
const HUD = 64;
const tips: Record<KeepyTip, { en: string; he: string }> = {
  tap: {
    en: 'Tap the balloon to bop it up. Don’t let it touch the floor!',
    he: 'לחצי על הבלון כדי להקפיץ אותו. אסור לו לגעת ברצפה!',
  },
  stars: {
    en: 'Bop the balloon into the star! Tap its side to steer it.',
    he: 'הקפיצי את הבלון אל הכוכב! לחצי על הצד שלו כדי לכוון.',
  },
  two: {
    en: 'Two balloons! Keep them both up in the air.',
    he: 'שני בלונים! שמרי על שניהם באוויר.',
  },
  wind: {
    en: 'It’s windy! The breeze pushes the balloon around.',
    he: 'יש רוח! הבריזה מזיזה את הבלון.',
  },
};

export default function KeepyUppy({
  lang,
  sound,
  speak,
  onStars,
  onExit,
}: Props) {
  const t = (en: string, he: string) => (lang === 'en' ? en : he);
  // Only mounted after a tap in the browser, so saved progress can load immediately.
  const [levels, setLevels] = useState(() =>
    loadLevels('keepy', keepyLevels.length),
  );
  const [playing, setPlaying] = useState<{ index: number; run: number } | null>(
    null,
  );
  const onStarsRef = useRef(onStars);
  useEffect(() => {
    onStarsRef.current = onStars;
  }, [onStars]);
  useEffect(() => {
    onStarsRef.current(arcadeStars(levels, KEEPY_PER_WORLD));
  }, [levels]);
  const won = useCallback((index: number, stars: number) => {
    setLevels((current) => {
      const next = recordLevel(current, index, stars);
      saveLevels('keepy', next);
      return next;
    });
  }, []);
  const start = (index: number) =>
    setPlaying((p) => ({ index, run: (p?.run ?? 0) + 1 }));
  return (
    <BlueyScreen theme="keepy">
      {playing ? (
        <Stage
          key={`${playing.index}-${playing.run}`}
          index={playing.index}
          level={keepyLevels[playing.index]}
          lang={lang}
          sound={sound}
          speak={speak}
          onWon={(stars) => won(playing.index, stars)}
          onReplay={() => start(playing.index)}
          onNext={() =>
            playing.index === keepyLevels.length - 1
              ? setPlaying(null)
              : start(playing.index + 1)
          }
          onMap={() => setPlaying(null)}
        />
      ) : (
        <LevelMap
          lang={lang}
          title={t('Keepy Uppy', 'קיפי אפי')}
          subtitle={t(
            'Bop the balloon. Never let it touch the floor!',
            'מקפיצים את הבלון. אסור לו לגעת ברצפה!',
          )}
          worlds={keepyWorlds}
          perWorld={KEEPY_PER_WORLD}
          levels={levels}
          hero={
            <PupPortrait
              palette={bluey}
              size={112}
              pose={{ reach: 0.9, mouth: 0.6, look: { x: 0.3, y: -1 } }}
            />
          }
          onPick={start}
          onExit={onExit}
        />
      )}
    </BlueyScreen>
  );
}

type Pup = { x: number; jump: number; sad: number };
type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
};

function Stage({
  level,
  index,
  lang,
  sound,
  speak,
  onWon,
  onReplay,
  onNext,
  onMap,
}: {
  level: KeepyLevel;
  index: number;
  lang: Lang;
  sound: boolean;
  speak: Speak;
  onWon: (stars: number) => void;
  onReplay: () => void;
  onNext: () => void;
  onMap: () => void;
}) {
  const t = (en: string, he: string) => (lang === 'en' ? en : he);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<KeepySim>(createKeepy(level));
  const [hud, setHud] = useState({ bops: 0, drops: 0, stars: 0 });
  const [result, setResult] = useState<number | null>(null);
  const [tip, setTip] = useState<string | null>(
    level.tip ? tips[level.tip][lang] : null,
  );
  const live = useRef({ sound, onWon, speak, lang });
  useEffect(() => {
    live.current = { sound, onWon, speak, lang };
  });
  const verandah = Math.floor(index / KEEPY_PER_WORLD) === 2;

  useEffect(() => {
    const { speak, lang } = live.current;
    if (level.tip) speak(`keepy-tip-${level.tip}`, tips[level.tip][lang]);
    const timer = setTimeout(() => setTip(null), 6500);
    return () => clearTimeout(timer);
  }, [level]);

  const restart = useCallback(() => {
    simRef.current = createKeepy(level);
    setHud({ bops: 0, drops: 0, stars: 0 });
  }, [level]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    let view = { s: 1, ox: 0, oy: 0, dpr: 1 };
    let background: HTMLCanvasElement | null = null;
    const particles: Particle[] = [];
    const pups: Pup[] = [
      { x: 140, jump: 99, sad: 0 },
      { x: 260, jump: 99, sad: 0 },
    ];
    const squash = [0, 0, 0];
    let floorFlash = 0;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let clock = 0;
    let startDelay = 1;
    let endTimer: ReturnType<typeof setTimeout> | undefined;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(1, rect.width),
        h = Math.max(1, rect.height);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      const s = Math.min(w / KW, (h - HUD) / KH);
      view = { s, ox: (w - KW * s) / 2, oy: HUD + (h - HUD - KH * s) / 2, dpr };
      background = document.createElement('canvas');
      background.width = canvas.width;
      background.height = canvas.height;
      const b = background.getContext('2d')!;
      b.setTransform(dpr * s, 0, 0, dpr * s, dpr * view.ox, dpr * view.oy);
      drawLounge(
        b,
        {
          x0: -view.ox / s,
          y0: -view.oy / s,
          x1: (w - view.ox) / s,
          y1: (h - view.oy) / s,
        },
        verandah,
      );
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const burst = (p: KPoint, colors: string[], count = 14) => {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2,
          sp = 60 + Math.random() * 160;
        particles.push({
          x: p.x,
          y: p.y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: 0,
          max: 0.5 + Math.random() * 0.5,
          color: colors[i % colors.length],
        });
      }
    };
    const sfx = (name: Parameters<typeof play>[0], n = 0) => {
      if (live.current.sound) play(name, n);
    };
    const handleEvents = (sim: KeepySim) => {
      for (const e of sim.events.splice(0)) {
        const b = sim.balloons[e.balloon];
        if (e.type === 'bop') {
          sfx('bop', Math.min(12, sim.bops));
          squash[e.balloon] = 1;
          pups[e.balloon % 2].jump = 0;
          burst({ x: b.x, y: b.y + BALLOON_R }, ['#ffffff', '#fff4b0'], 6);
          navigator.vibrate?.(10);
          const { speak } = live.current;
          if (sim.bops <= 10 && sim.status === 'play')
            speak(`number-${sim.bops}`, String(sim.bops));
        } else if (e.type === 'drop') {
          sfx('lose');
          floorFlash = 1;
          pups[e.balloon % 2].sad = 1.2;
          burst({ x: b.x, y: FLOOR - 4 }, ['#c98b52', '#ffffff'], 10);
        } else if (e.type === 'star') {
          sfx('star', sim.targets.filter((x) => x.got).length - 1);
          const got = sim.targets.filter((x) => x.got);
          burst(got[got.length - 1], ['#ffd23f', '#fff4b0', '#ffffff'], 18);
        } else if (e.type === 'win') {
          sfx('win');
          for (const p of pups) p.jump = 0;
          const stars = keepyStars(sim);
          endTimer = setTimeout(() => {
            const { onWon, speak, lang } = live.current;
            setResult(stars);
            onWon(stars);
            speak('correct', lang === 'en' ? 'That’s it, Mia!' : 'בדיוק, מיה!');
          }, 1200);
        }
        setHud({ bops: sim.bops, drops: sim.drops, stars: keepyStars(sim) });
      }
    };

    const render = () => {
      const sim = simRef.current;
      const { s, ox, oy, dpr } = view;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (background) ctx.drawImage(background, 0, 0);
      ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
      if (floorFlash > 0) {
        ctx.fillStyle = `rgba(255,90,90,${floorFlash * 0.35})`;
        ctx.fillRect(-200, FLOOR, KW + 400, 200);
      }
      // Breeze streaks.
      const wind = windAt(sim);
      if (level.wind) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        for (let i = 0; i < 6; i++) {
          const speed = wind * 3;
          const x = ((((i * 97 + clock * speed) % 520) + 520) % 520) - 60;
          const y = 120 + i * 70 + Math.sin(clock * 2 + i) * 10;
          ctx.globalAlpha = Math.min(1, Math.abs(wind) / 60) * 0.8;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.quadraticCurveTo(
            x + Math.sign(wind) * 20,
            y - 6,
            x + Math.sign(wind) * 40,
            y,
          );
          ctx.stroke();
        }
        ctx.restore();
      }
      // The next star to aim for.
      const target = activeTarget(sim);
      if (target)
        drawStar(
          ctx,
          target.x,
          target.y + Math.sin(clock * 2.5) * 4,
          22,
          clock,
        );
      for (const tg of sim.targets)
        if (tg.got && sim.t - tg.at < 0.4) {
          const age = sim.t - tg.at;
          drawStar(
            ctx,
            tg.x,
            tg.y - age * 90,
            22 * (1 + age * 2),
            clock,
            1 - age / 0.4,
          );
        }
      // Bluey and Bingo run underneath their balloons.
      const pupScale = 0.5;
      const groundY = FLOOR - 124 * pupScale + 8;
      pups.forEach((p, i) => {
        if (i === 1 && sim.balloons.length < 2) {
          // Bingo cheers from the side when there is only one balloon.
          p.x += ((sim.balloons[0].x < 200 ? 340 : 60) - p.x) * 0.03;
        } else {
          const b = sim.balloons[i];
          p.x += (Math.max(55, Math.min(345, b.x)) - p.x) * 0.06;
        }
        const hop = p.jump < 0.4 ? Math.sin((p.jump / 0.4) * Math.PI) * 26 : 0;
        const ball = sim.balloons[Math.min(i, sim.balloons.length - 1)];
        const dx = ball.x - p.x,
          dy = ball.y - groundY;
        const d = Math.hypot(dx, dy) || 1;
        drawPup(ctx, i === 0 ? bluey : bingo, p.x, groundY - hop, pupScale, {
          look: { x: dx / d, y: dy / d },
          reach: p.jump < 0.4 || sim.status === 'won' ? 0.9 : 0,
          mouth: p.jump < 0.5 || sim.status === 'won' ? 0.6 : 0,
          sad: p.sad > 0,
          ears: p.sad > 0 ? 0.3 : 0,
          blink: (clock + i * 1.7) % 3.7 < 0.12 ? 1 : 0,
          tail: Math.sin(clock * (p.jump < 0.6 ? 16 : 6)) * 0.3,
        });
      });
      sim.balloons.forEach((b, i) =>
        drawBalloon(
          ctx,
          b.x,
          b.y,
          BALLOON_R,
          b.color,
          clock + i,
          b.vx,
          squash[i],
        ),
      );
      // Waiting balloons hover with a gentle "ready" pulse.
      if (startDelay > 0) {
        ctx.save();
        ctx.fillStyle = '#1f3a78';
        ctx.font = '900 44px Nunito, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.globalAlpha = Math.min(1, startDelay * 2);
        ctx.fillText(lang === 'en' ? 'Ready?' : 'מוכנה?', KW / 2, 420);
        ctx.restore();
      }
      for (const p of particles) {
        ctx.globalAlpha = Math.max(0, 1 - p.life / p.max);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      clock += dt;
      const sim = simRef.current;
      if (startDelay > 0) startDelay -= dt;
      else {
        acc += dt;
        while (acc >= KSTEP) {
          stepKeepy(sim);
          acc -= KSTEP;
        }
      }
      handleEvents(sim);
      for (const p of pups) {
        p.jump += dt;
        p.sad = Math.max(0, p.sad - dt);
      }
      for (let i = 0; i < squash.length; i++)
        squash[i] = Math.max(0, squash[i] - dt * 5);
      floorFlash = Math.max(0, floorFlash - dt * 2.5);
      for (const p of particles) {
        p.life += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 200 * dt;
      }
      for (let i = particles.length - 1; i >= 0; i--)
        if (particles[i].life > particles[i].max) particles.splice(i, 1);
      render();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const down = (e: PointerEvent) => {
      unlockAudio();
      setTip(null);
      const rect = canvas.getBoundingClientRect();
      const p = {
        x: (e.clientX - rect.left - view.ox) / view.s,
        y: (e.clientY - rect.top - view.oy) / view.s,
      };
      if (startDelay > 0) startDelay = 0;
      bopAt(simRef.current, p);
    };
    canvas.addEventListener('pointerdown', down);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      clearTimeout(endTimer);
      canvas.removeEventListener('pointerdown', down);
    };
  }, [level, verandah, lang]);

  const last = index === keepyLevels.length - 1;
  return (
    <div className="bluey-stage" data-level={index + 1}>
      <canvas
        ref={canvasRef}
        className="bluey-canvas"
        aria-label={t(
          'Game area. Tap the balloon to bop it.',
          'אזור המשחק. לחצי על הבלון.',
        )}
      />
      <header className="bluey-bar bluey-hud">
        <button
          className="bluey-round"
          onClick={onMap}
          aria-label={t('Levels', 'שלבים')}
        >
          <ArrowLeft size={22} />
        </button>
        <span className="bluey-pill keepy-count">
          🎈 <bdi dir="ltr">{Math.min(hud.bops, level.goal)} / {level.goal}</bdi>
          <span className="bluey-hud-stars" aria-label={`${hud.stars} / 3`}>
            {[0, 1, 2].map((n) => (
              <Star
                key={n}
                size={16}
                fill={(hud.bops ? hud.stars : 3) > n ? 'currentColor' : 'none'}
              />
            ))}
          </span>
        </span>
        <span className="bluey-bar-end">
          <button
            className="bluey-round"
            onClick={restart}
            aria-label={t('Restart level', 'התחלת השלב מחדש')}
          >
            <RotateCcw size={21} />
          </button>
        </span>
      </header>
      <div className="keepy-progress" aria-hidden="true">
        <i
          style={{
            width: `${(Math.min(hud.bops, level.goal) / level.goal) * 100}%`,
          }}
        />
      </div>
      {tip && (
        <button className="bluey-tip" onClick={() => setTip(null)}>
          {tip}
        </button>
      )}
      {result !== null && (
        <ResultCard
          lang={lang}
          title={t('Keepy uppy champion!', 'אלופת קיפי אפי!')}
          message={
            result === 3
              ? t(
                  'It never touched the floor! Amazing!',
                  'הבלון לא נגע ברצפה אפילו פעם אחת! מדהים!',
                )
              : t(
                  'Can you do it without any floor bumps?',
                  'תצליחי בלי שהבלון ייגע ברצפה?',
                )
          }
          stars={result}
          last={last}
          hero={
            <PupPortrait
              palette={bluey}
              size={96}
              pose={{ mouth: 0.6, reach: 0.9 }}
            />
          }
          onNext={onNext}
          onReplay={onReplay}
          onMap={onMap}
        />
      )}
    </div>
  );
}

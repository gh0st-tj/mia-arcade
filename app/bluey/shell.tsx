'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import { ArrowLeft, Lock, Play, RotateCcw, Star } from 'lucide-react';
import type { Lang } from '@/lib/game-data';
import {
  bingo,
  bluey,
  drawBackyard,
  drawBalloon,
  drawBiscuit,
  drawLounge,
  drawPup,
  scenes,
  type Palette,
  type Pose,
} from './draw';

/** A small, static canvas portrait of a pup, crisp on high-DPI screens. */
export function PupPortrait({
  palette,
  size,
  pose,
  className,
}: {
  palette: Palette;
  size: number;
  pose?: Pose;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    // The pup (ears to paws) is about 240 units tall.
    const scale = size / 250;
    drawPup(ctx, palette, size / 2, size * 0.4, scale, pose);
  }, [palette, size, pose]);
  return (
    <canvas
      ref={ref}
      className={className}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}

/**
 * Full-screen layer for the Bluey games. It locks page scrolling so swipes
 * and taps always reach the game on phones.
 */
export function BlueyScreen({
  theme,
  children,
}: {
  theme: string;
  children: ReactNode;
}) {
  useEffect(() => {
    const html = document.documentElement;
    const previous = html.style.overflow;
    html.style.overflow = 'hidden';
    return () => {
      html.style.overflow = previous;
    };
  }, []);
  return <div className={`bluey-screen bluey-${theme}`}>{children}</div>;
}

export function LevelMap({
  lang,
  title,
  subtitle,
  worlds,
  perWorld,
  levels,
  hero,
  onPick,
  onExit,
}: {
  lang: Lang;
  title: string;
  subtitle: string;
  worlds: { en: string; he: string }[];
  perWorld: number;
  levels: number[];
  hero: ReactNode;
  onPick: (index: number) => void;
  onExit: () => void;
}) {
  const t = (en: string, he: string) => (lang === 'en' ? en : he);
  const unlocked = Math.max(
    0,
    levels.findIndex((n) => n === 0),
  );
  const furthest = levels.every((n) => n > 0) ? levels.length - 1 : unlocked;
  const earned = levels.reduce((a, b) => a + b, 0);
  return (
    <div className="bluey-map">
      <header className="bluey-bar">
        <button
          className="bluey-round"
          onClick={onExit}
          aria-label={t('Back to all games', 'חזרה לכל המשחקים')}
        >
          <ArrowLeft size={22} />
        </button>
        <span className="bluey-pill">
          <Star size={17} fill="currentColor" />
          <bdi dir="ltr">{earned} / {levels.length * 3}</bdi>
        </span>
      </header>
      <div className="bluey-map-hero">
        {hero}
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>
      <button className="bluey-play-next" onClick={() => onPick(furthest)}>
        <Play size={22} fill="currentColor" />
        {levels.every((n) => n > 0)
          ? t('Play again', 'לשחק שוב')
          : t(`Play level ${furthest + 1}`, `לשחק בשלב ${furthest + 1}`)}
      </button>
      {worlds.map((world, w) => (
        <section key={w} className={`bluey-world world-${w}`}>
          <h2>
            <span>{w + 1}</span>
            {world[lang]}
          </h2>
          <div className="bluey-levels">
            {Array.from({ length: perWorld }, (_, j) => {
              const i = w * perWorld + j;
              const locked = i > furthest;
              return (
                <button
                  key={i}
                  className={`bluey-level ${levels[i] ? 'done' : ''} ${i === furthest ? 'current' : ''}`}
                  disabled={locked}
                  onClick={() => onPick(i)}
                  aria-label={
                    locked
                      ? t(`Level ${i + 1}, locked`, `שלב ${i + 1}, נעול`)
                      : t(
                          `Level ${i + 1}, ${levels[i]} stars`,
                          `שלב ${i + 1}, ${levels[i]} כוכבים`,
                        )
                  }
                >
                  {locked ? <Lock size={20} /> : <b>{i + 1}</b>}
                  <span className="bluey-level-stars" aria-hidden="true">
                    {[0, 1, 2].map((n) => (
                      <Star
                        key={n}
                        size={12}
                        fill={levels[i] > n ? 'currentColor' : 'none'}
                      />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
      <p className="bluey-map-note">
        {t(
          'Finish a whole row to win a star for the arcade!',
          'סיימי שורה שלמה כדי לזכות בכוכב לארקייד!',
        )}
      </p>
    </div>
  );
}

export function ResultCard({
  lang,
  title,
  message,
  stars,
  hero,
  last,
  onNext,
  onReplay,
  onMap,
}: {
  lang: Lang;
  title: string;
  message: string;
  stars: number;
  hero: ReactNode;
  last: boolean;
  onNext: () => void;
  onReplay: () => void;
  onMap: () => void;
}) {
  const t = (en: string, he: string) => (lang === 'en' ? en : he);
  return (
    <section className="bluey-result" aria-label={title}>
      <div className="bluey-result-card">
        {hero}
        <div className="bluey-result-stars">
          {[0, 1, 2].map((n) => (
            <Star
              key={n}
              size={n === 1 ? 54 : 44}
              fill={stars > n ? 'currentColor' : 'none'}
              className={stars > n ? 'got' : ''}
              style={{ animationDelay: `${0.25 + n * 0.25}s` }}
            />
          ))}
        </div>
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="bluey-result-actions">
          <button className="bluey-big" onClick={onNext}>
            <Play size={22} fill="currentColor" />
            {last ? t('All levels', 'כל השלבים') : t('Next level', 'לשלב הבא')}
          </button>
          <div>
            <button className="bluey-soft" onClick={onReplay}>
              <RotateCcw size={19} />
              {t('Again', 'שוב')}
            </button>
            <button className="bluey-soft" onClick={onMap}>
              <Star size={19} />
              {t('Levels', 'שלבים')}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Lobby card art: a little slice of each game’s scene. */
export function BlueyCardArt({ game }: { game: 'treats' | 'keepy' }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const paint = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(3, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      // Show a 200-unit-tall band of the 400-wide world, centred.
      const s = rect.height / 200;
      const ox = (rect.width - 400 * s) / 2;
      const top = 470;
      ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, -dpr * top * s);
      const view = {
        x0: -ox / s,
        y0: top,
        x1: (rect.width - ox) / s,
        y1: top + 200,
      };
      if (game === 'treats') {
        drawBackyard(ctx, scenes[0], view);
        ctx.strokeStyle = '#e0a35c';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(200, top);
        ctx.lineTo(200, 505);
        ctx.stroke();
        drawBiscuit(ctx, 200, 515, 20, 0.3);
        drawPup(ctx, bingo, 200, 600, 0.5, {
          mouth: 0.8,
          look: { x: 0, y: -1 },
        });
        drawPup(ctx, bluey, 318, 616, 0.36, {
          reach: 0.9,
          mouth: 0.5,
          look: { x: -1, y: -0.5 },
        });
      } else {
        drawLounge(ctx, view, false);
        drawBalloon(ctx, 250, 515, 26, 0, 0.5, 0);
        drawPup(ctx, bluey, 190, 598, 0.5, {
          reach: 0.9,
          mouth: 0.6,
          look: { x: 0.8, y: -1 },
        });
        drawPup(ctx, bingo, 88, 612, 0.38, {
          mouth: 0.5,
          look: { x: 1, y: -0.6 },
        });
      }
    };
    paint();
    const observer = new ResizeObserver(paint);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [game]);
  return <canvas ref={ref} className="bluey-card-art" aria-hidden="true" />;
}

'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Lightbulb, RotateCcw, Star } from 'lucide-react';
import type { Lang } from '@/lib/game-data';
import {
  BUBBLE_R,
  COOKIE_R,
  LEVELS_PER_WORLD,
  STEP,
  WORLD_H,
  WORLD_W,
  blow,
  bouncerEnds,
  createSim,
  distance,
  levels as levelDefs,
  linkActive,
  nextHint,
  perched,
  pop,
  slice,
  snipNear,
  starsGot,
  stepSim,
  worlds,
  type LevelDef,
  type Point,
  type Sim,
  type Tip,
} from '@/lib/treat-drop';
import {
  arcadeStars,
  loadLevels,
  recordLevel,
  saveLevels,
} from '@/lib/bluey-progress';
import {
  bingo,
  bluey,
  drawBackyard,
  drawBiscuit,
  drawBubble,
  drawFan,
  drawHook,
  drawPeg,
  drawPerch,
  drawPup,
  drawStar,
  drawTrampoline,
  scenes,
} from './draw';
import { play, unlockAudio, type Sfx } from './sfx';
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
const tips: Record<Tip, { en: string; he: string }> = {
  cut: {
    en: 'Swipe across the rope to snip it. Feed Bingo the biscuit!',
    he: 'החליקי את האצבע על החבל כדי לגזור אותו. האכילי את בינגו בעוגייה!',
  },
  swing: {
    en: 'Wait until the biscuit swings over Bingo, then snip!',
    he: 'חכי שהעוגייה תתנדנד מעל בינגו, ואז גזרי!',
  },
  two: {
    en: 'Two ropes! Which one should you snip first?',
    he: 'שני חבלים! איזה חבל לגזור קודם?',
  },
  bounce: {
    en: 'Boing! The trampoline bounces the biscuit.',
    he: 'בוינג! הטרמפולינה מקפיצה את העוגייה.',
  },
  bubble: {
    en: 'Bubbles float the biscuit up high!',
    he: 'בועות מרימות את העוגייה גבוה למעלה!',
  },
  pop: {
    en: 'Tap the bubble to pop it, then snip the rope.',
    he: 'לחצי על הבועה כדי לפוצץ אותה, ואז גזרי את החבל.',
  },
  hook: {
    en: 'Swing the biscuit into the dotted circle. A new rope will grab it!',
    he: 'נדנדי את העוגייה אל העיגול המנוקד. חבל חדש יתפוס אותה!',
  },
  fan: {
    en: 'Tap the fan to blow the bubble toward Bingo!',
    he: 'לחצי על המאוורר כדי לנשוף את הבועה אל בינגו!',
  },
};

export default function TreatDrop({
  lang,
  sound,
  speak,
  onStars,
  onExit,
}: Props) {
  const t = (en: string, he: string) => (lang === 'en' ? en : he);
  // Only mounted after a tap in the browser, so saved progress can load immediately.
  const [levels, setLevels] = useState(() =>
    loadLevels('treats', levelDefs.length),
  );
  const [playing, setPlaying] = useState<{ index: number; run: number } | null>(
    null,
  );
  const onStarsRef = useRef(onStars);
  useEffect(() => {
    onStarsRef.current = onStars;
  }, [onStars]);
  useEffect(() => {
    onStarsRef.current(arcadeStars(levels, LEVELS_PER_WORLD));
  }, [levels]);
  const won = useCallback((index: number, stars: number) => {
    setLevels((current) => {
      const next = recordLevel(current, index, stars);
      saveLevels('treats', next);
      return next;
    });
  }, []);
  const start = (index: number) =>
    setPlaying((p) => ({ index, run: (p?.run ?? 0) + 1 }));
  return (
    <BlueyScreen theme="treats">
      {playing ? (
        <Stage
          key={`${playing.index}-${playing.run}`}
          index={playing.index}
          def={levelDefs[playing.index]}
          lang={lang}
          sound={sound}
          speak={speak}
          onWon={(stars) => won(playing.index, stars)}
          onReplay={() => start(playing.index)}
          onNext={() =>
            playing.index === levelDefs.length - 1
              ? setPlaying(null)
              : start(playing.index + 1)
          }
          onMap={() => setPlaying(null)}
        />
      ) : (
        <LevelMap
          lang={lang}
          title={t('Bingo’s Biscuit Drop', 'העוגייה של בינגו')}
          subtitle={t(
            'Snip the ropes and feed Bingo her biscuit!',
            'גוזרים חבלים ומאכילים את בינגו בעוגייה!',
          )}
          worlds={worlds}
          perWorld={LEVELS_PER_WORLD}
          levels={levels}
          hero={
            <PupPortrait palette={bingo} size={112} pose={{ mouth: 0.7 }} />
          }
          onPick={start}
          onExit={onExit}
        />
      )}
    </BlueyScreen>
  );
}

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  kind: 'spark' | 'heart' | 'crumb' | 'ring';
};
type View = {
  s: number;
  ox: number;
  oy: number;
  w: number;
  h: number;
  dpr: number;
};

function Stage({
  def,
  index,
  lang,
  sound,
  speak,
  onWon,
  onReplay,
  onNext,
  onMap,
}: {
  def: LevelDef;
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
  const simRef = useRef<Sim>(createSim(def));
  const [hudStars, setHudStars] = useState(0);
  const [result, setResult] = useState<number | null>(null);
  const [oops, setOops] = useState(false);
  const [hint, setHint] = useState(false);
  const [tip, setTip] = useState<string | null>(
    def.tip ? tips[def.tip][lang] : null,
  );
  // The animation loop reads the latest props through refs.
  const live = useRef({ sound, hint, onWon, speak, lang });
  useEffect(() => {
    live.current = { sound, hint, onWon, speak, lang };
  });
  const world = Math.floor(index / LEVELS_PER_WORLD);

  // Speak the new idea once, when the level opens.
  useEffect(() => {
    const { speak, lang } = live.current;
    if (def.tip) speak(`treats-tip-${def.tip}`, tips[def.tip][lang]);
    const timer = setTimeout(() => setTip(null), 6500);
    return () => clearTimeout(timer);
  }, [def]);

  const restart = useCallback(() => {
    simRef.current = createSim(def);
    setHudStars(0);
    setOops(false);
  }, [def]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    let view: View = { s: 1, ox: 0, oy: 0, w: 1, h: 1, dpr: 1 };
    let background: HTMLCanvasElement | null = null;
    const particles: Particle[] = [];
    const trail: { x: number; y: number; at: number }[] = [];
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let clock = 0;
    let startDelay = 0.6;
    let nextBlink = 2;
    let chewUntil = 0;
    let endTimer: ReturnType<typeof setTimeout> | undefined;
    let pointer: { id: number; last: Point } | null = null;
    const scene = scenes[world];
    const goal = def.goal;
    const pupScale = 0.6;
    const headY = goal.y - 16;
    const blueyAt = { x: goal.x > 200 ? 62 : 338, y: 628 };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(1, rect.width),
        h = Math.max(1, rect.height);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      const s = Math.min(w / WORLD_W, (h - HUD) / WORLD_H);
      view = {
        s,
        ox: (w - WORLD_W * s) / 2,
        oy: HUD + (h - HUD - WORLD_H * s) / 2,
        w,
        h,
        dpr,
      };
      // Paint the scenery once per size; it fills the whole screen.
      background = document.createElement('canvas');
      background.width = canvas.width;
      background.height = canvas.height;
      const b = background.getContext('2d')!;
      b.setTransform(dpr * s, 0, 0, dpr * s, dpr * view.ox, dpr * view.oy);
      drawBackyard(b, scene, {
        x0: -view.ox / s,
        y0: -view.oy / s,
        x1: (w - view.ox) / s,
        y1: (h - view.oy) / s,
      });
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const burst = (
      p: Point,
      kind: Particle['kind'],
      count: number,
      colors: string[],
    ) => {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2,
          sp = 60 + Math.random() * 180;
        particles.push({
          x: p.x,
          y: p.y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - (kind === 'heart' ? 120 : 0),
          life: 0,
          max: 0.6 + Math.random() * 0.6,
          size:
            kind === 'heart' ? 9 + Math.random() * 6 : 3 + Math.random() * 4,
          color: colors[i % colors.length],
          kind,
        });
      }
    };
    const sfx = (name: Sfx, n = 0) => {
      if (live.current.sound) play(name, n);
    };
    const handleEvents = (sim: Sim) => {
      for (const e of sim.events.splice(0)) {
        const c = { x: sim.cookie.x, y: sim.cookie.y };
        if (e === 'star') {
          const got = sim.stars.filter((s) => s.got);
          const star = got.reduce((a, b) => (b.at > a.at ? b : a));
          sfx('star', got.length - 1);
          burst(star, 'spark', 16, ['#ffd23f', '#fff4b0', '#ffffff']);
          setHudStars(got.length);
          navigator.vibrate?.(12);
        } else if (e === 'cut') {
          sfx('cut');
          navigator.vibrate?.(8);
        } else if (e === 'pop') {
          sfx('pop');
          burst(c, 'ring', 12, ['#ffffff', '#bfe6ff']);
        } else if (e === 'win') {
          sfx('win');
          chewUntil = clock + 1.1;
          burst(goal, 'crumb', 14, ['#d99746', '#6b3a1f', '#f7cf86']);
          burst({ x: goal.x, y: goal.y - 40 }, 'heart', 6, [
            '#ff6b9a',
            '#ff8fb8',
          ]);
          const stars = starsGot(sim);
          endTimer = setTimeout(() => {
            const { onWon, speak, lang } = live.current;
            setResult(stars);
            onWon(stars);
            speak('correct', lang === 'en' ? 'That’s it, Mia!' : 'בדיוק, מיה!');
          }, 1300);
        } else if (e === 'lose') {
          sfx('lose');
          setOops(true);
          endTimer = setTimeout(() => {
            simRef.current = createSim(def);
            setHudStars(0);
            setOops(false);
          }, 1500);
        } else sfx(e);
      }
    };

    const drawRope = (points: Point[], alpha: number) => {
      if (points.length < 2) return;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const path = () => {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length - 1; i++) {
          const mx = (points[i].x + points[i + 1].x) / 2,
            my = (points[i].y + points[i + 1].y) / 2;
          ctx.quadraticCurveTo(points[i].x, points[i].y, mx, my);
        }
        const end = points[points.length - 1];
        ctx.lineTo(end.x, end.y);
      };
      path();
      ctx.lineWidth = 6.5;
      ctx.strokeStyle = '#7a4b25';
      ctx.stroke();
      path();
      ctx.lineWidth = 3.8;
      ctx.strokeStyle = '#e0a35c';
      ctx.stroke();
      path();
      ctx.setLineDash([3, 6]);
      ctx.lineWidth = 3.8;
      ctx.strokeStyle = '#f8d9a4';
      ctx.stroke();
      ctx.restore();
    };
    const drawHint = (sim: Sim) => {
      const action = nextHint(sim);
      if (!action) return;
      let at: Point | null = null;
      let swipe = false;
      if ('cut' in action) {
        const rope = sim.ropes[action.cut];
        if (rope) {
          at = rope.nodes[Math.floor(rope.nodes.length / 2)];
          swipe = true;
        } else {
          const hook = sim.def.hooks?.[action.cut - sim.def.ropes.length];
          if (hook) at = hook;
        }
      } else if ('pop' in action) {
        at =
          sim.held >= 0
            ? sim.cookie
            : (sim.bubbles.find((b) => b.state === 'idle') ?? null);
      } else at = sim.fans[action.fan];
      if (!at) return;
      const pulse = (Math.sin(clock * 5) + 1) / 2;
      ctx.save();
      ctx.strokeStyle = `rgba(255,255,255,${0.5 + pulse * 0.5})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(at.x, at.y, 26 + pulse * 8, 0, Math.PI * 2);
      ctx.stroke();
      // A little pointing hand; it slides sideways for a swipe.
      const slide = swipe ? ((clock * 1.2) % 1) * 90 - 45 : 0;
      ctx.font = '38px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('👆', at.x + slide, at.y + 42);
      ctx.restore();
    };

    const render = () => {
      const sim = simRef.current;
      const { s, ox, oy, dpr } = view;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (background) ctx.drawImage(background, 0, 0);
      ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy);
      if (perched(goal)) drawPerch(ctx, goal.x, headY + 74);
      // Bluey cheers from the lawn.
      const cheering =
        sim.status === 'won' || particles.some((p) => p.kind === 'spark');
      drawPup(
        ctx,
        bluey,
        blueyAt.x,
        blueyAt.y - (cheering ? Math.abs(Math.sin(clock * 9)) * 8 : 0),
        0.42,
        {
          look: {
            x: Math.max(-1, Math.min(1, (sim.cookie.x - blueyAt.x) / 150)),
            y: Math.max(-1, Math.min(1, (sim.cookie.y - blueyAt.y) / 200)),
          },
          mouth: cheering ? 0.6 : 0,
          reach: cheering ? 0.9 : 0,
          blink: (clock + 1.3) % 4 < 0.12 ? 1 : 0,
          tail: Math.sin(clock * 7) * 0.3,
        },
      );
      for (const h of sim.hooks) drawHook(ctx, h.x, h.y, h.r, h.used, clock);
      for (const b of sim.bouncers) {
        const [a, e] = bouncerEnds(b);
        const since = (sim.step - b.hit) * STEP;
        drawTrampoline(
          ctx,
          a,
          e,
          since < 0.35 ? Math.sin(since * 30) * (1 - since / 0.35) * 1.5 : 0,
        );
      }
      sim.fans.forEach((f) =>
        drawFan(ctx, f.x, f.y, f.angle, clock, f.until >= sim.step),
      );
      for (const star of sim.stars) {
        if (!star.got)
          drawStar(
            ctx,
            star.x,
            star.y + Math.sin(clock * 2 + star.x) * 3,
            17,
            clock,
          );
        else {
          const age = (sim.step - star.at) * STEP;
          if (age < 0.4)
            drawStar(
              ctx,
              star.x,
              star.y - age * 80,
              17 * (1 + age * 1.5),
              clock,
              1 - age / 0.4,
            );
        }
      }
      // Bingo waits with her eyes on the biscuit.
      const c = sim.cookie;
      const d = distance(c, goal);
      const chewing = clock < chewUntil;
      const mouth = chewing
        ? (Math.sin(clock * 22) + 1) / 2
        : sim.status === 'play'
          ? Math.max(0, Math.min(1, 1.2 - d / 180))
          : 0;
      if (clock > nextBlink + 0.13) nextBlink = clock + 2 + Math.random() * 3;
      const lookX =
        sim.status === 'play' ? (c.x - goal.x) / Math.max(60, d) : 0;
      const lookY = sim.status === 'play' ? (c.y - headY) / Math.max(60, d) : 0;
      drawPup(
        ctx,
        bingo,
        goal.x,
        headY + Math.sin(clock * 2.2) * 1.2,
        pupScale,
        {
          mouth,
          blink: chewing ? 0.9 : clock > nextBlink ? 1 : 0,
          look: { x: lookX, y: lookY },
          tail: Math.sin(clock * (mouth > 0.3 || chewing ? 14 : 5)) * 0.3,
          sad: sim.status === 'lost',
          ears: sim.status === 'lost' ? 0.35 : 0,
        },
      );
      // Ropes and their pegs.
      for (const rope of sim.ropes) {
        const n = rope.nodes.length;
        const upto = rope.cut < 0 ? n : rope.cut + 1;
        const main: Point[] = rope.nodes.slice(0, upto);
        if (rope.cut < 0) main.push(c);
        drawRope(main, 1);
        if (rope.cut >= 0 && !rope.released) {
          const tail: Point[] = rope.nodes.slice(rope.cut + 1);
          if (linkActive(rope, n - 1) && sim.status === 'play') tail.push(c);
          drawRope(tail, 1 - ((sim.step - rope.cutStep) * STEP) / 0.4);
        }
      }
      for (const r of sim.def.ropes) drawPeg(ctx, r.x, r.y);
      // The biscuit, inside its bubble if one is carrying it.
      if (sim.status !== 'won') {
        drawBiscuit(ctx, c.x, c.y, COOKIE_R, (c.x - def.cookie.x) / 60);
      }
      for (const b of sim.bubbles) {
        if (b.state === 'idle') drawBubble(ctx, b.x, b.y, BUBBLE_R - 4, clock);
        if (b.state === 'held') drawBubble(ctx, c.x, c.y, BUBBLE_R, clock);
      }
      // Particles.
      for (const p of particles) {
        const k = 1 - p.life / p.max;
        ctx.globalAlpha = Math.max(0, k);
        if (p.kind === 'heart') {
          ctx.font = `${p.size * 2}px system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText('💗', p.x, p.y);
        } else if (p.kind === 'ring') {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (2 - k), 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (0.4 + k * 0.6), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      // The finger’s cutting trail.
      const now = clock;
      while (trail.length && now - trail[0].at > 0.18) trail.shift();
      if (trail.length > 1) {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (let i = 1; i < trail.length; i++) {
          const k = 1 - (now - trail[i].at) / 0.18;
          ctx.strokeStyle = `rgba(255,255,255,${k * 0.9})`;
          ctx.lineWidth = 2 + k * 7;
          ctx.beginPath();
          ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
          ctx.lineTo(trail[i].x, trail[i].y);
          ctx.stroke();
        }
        ctx.restore();
      }
      if (live.current.hint && sim.status === 'play') drawHint(sim);
    };

    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      clock += dt;
      const sim = simRef.current;
      if (startDelay > 0) startDelay -= dt;
      else {
        acc += dt;
        while (acc >= STEP) {
          stepSim(sim);
          acc -= STEP;
        }
      }
      handleEvents(sim);
      for (const p of particles) {
        p.life += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy +=
          (p.kind === 'crumb' ? 700 : p.kind === 'heart' ? -40 : 160) * dt;
        p.vx *= 0.98;
      }
      for (let i = particles.length - 1; i >= 0; i--)
        if (particles[i].life > particles[i].max) particles.splice(i, 1);
      render();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const toWorld = (e: PointerEvent): Point => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left - view.ox) / view.s,
        y: (e.clientY - rect.top - view.oy) / view.s,
      };
    };
    const down = (e: PointerEvent) => {
      unlockAudio();
      setTip(null);
      const sim = simRef.current;
      const p = toWorld(e);
      canvas.setPointerCapture?.(e.pointerId);
      pointer = { id: e.pointerId, last: p };
      trail.push({ ...p, at: clock });
      if (sim.held >= 0 && distance(p, sim.cookie) < BUBBLE_R + 26) {
        pop(sim);
        return;
      }
      let blew = false;
      sim.fans.forEach((f, i) => {
        if (distance(p, f) < 48) blew = blow(sim, i) || blew;
      });
      if (blew) return;
      snipNear(sim, p, 16);
    };
    const move = (e: PointerEvent) => {
      if (!pointer || pointer.id !== e.pointerId) return;
      const p = toWorld(e);
      slice(simRef.current, pointer.last, p);
      pointer.last = p;
      trail.push({ ...p, at: clock });
    };
    const up = (e: PointerEvent) => {
      if (pointer?.id === e.pointerId) pointer = null;
    };
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', up);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      clearTimeout(endTimer);
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', up);
    };
  }, [def, world]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') restart();
      if (e.key === ' ') {
        e.preventDefault();
        pop(simRef.current);
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [restart]);

  const last = index === levelDefs.length - 1;
  return (
    <div className="bluey-stage" data-level={index + 1}>
      <canvas
        ref={canvasRef}
        className="bluey-canvas"
        aria-label={t(
          'Game area. Swipe across a rope to cut it.',
          'אזור המשחק. החליקי על חבל כדי לגזור אותו.',
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
        <span className="bluey-pill">
          {t(`Level ${index + 1}`, `שלב ${index + 1}`)}
          <span className="bluey-hud-stars" aria-label={`${hudStars} / 3`}>
            {[0, 1, 2].map((n) => (
              <Star
                key={n}
                size={16}
                fill={hudStars > n ? 'currentColor' : 'none'}
              />
            ))}
          </span>
        </span>
        <span className="bluey-bar-end">
          <button
            className={`bluey-round ${hint ? 'on' : ''}`}
            onClick={() => setHint((h) => !h)}
            aria-pressed={hint}
            aria-label={t('Show a hint', 'רמז')}
          >
            <Lightbulb size={21} />
          </button>
          <button
            className="bluey-round"
            onClick={restart}
            aria-label={t('Restart level', 'התחלת השלב מחדש')}
          >
            <RotateCcw size={21} />
          </button>
        </span>
      </header>
      {tip && (
        <button className="bluey-tip" onClick={() => setTip(null)}>
          {tip}
        </button>
      )}
      {oops && (
        <div className="bluey-oops" aria-live="polite">
          {t('Oops! Let’s try again!', 'אופס! בואי ננסה שוב!')}
        </div>
      )}
      {result !== null && (
        <ResultCard
          lang={lang}
          title={t('Yum! Bingo loved it!', 'יאמי! בינגו אהבה את זה!')}
          message={
            result === 3
              ? t('All three stars! Hooray!', 'כל שלושת הכוכבים! הידד!')
              : t(
                  'Can you catch every star next time?',
                  'תצליחי לתפוס את כל הכוכבים בפעם הבאה?',
                )
          }
          stars={result}
          last={last}
          hero={
            <PupPortrait
              palette={bingo}
              size={96}
              pose={{ mouth: 0.5, blink: 1 }}
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

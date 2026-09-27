/**
 * Keepy Uppy: tap the balloon so it never touches the floor.
 *
 * A fixed 400×720 lounge room stepped 120 times a second. Balloons are
 * floaty: gravity is gentle and air drag caps how fast they fall, so later
 * levels mostly add a second balloon, a breeze and stars to aim for.
 * A balloon that touches the floor bounces back up; it only costs stars.
 */
export const KW = 400;
export const KH = 720;
export const FLOOR = 640;
export const CEILING = 40;
export const BALLOON_R = 36;
/** Taps count as a bop this far outside the balloon, for little fingers. */
export const TAP_SLOP = 38;
export const KSTEP = 1 / 120;
const DRAG = 1.1;
const COOLDOWN = 0.18;

export type KPoint = { x: number; y: number };
export type KeepyTip = 'tap' | 'stars' | 'two' | 'wind';
export type KeepyLevel = {
  balloons: number;
  goal: number;
  gravity: number;
  bop: number;
  /** Strength of the breeze from the window, in px/s². */
  wind?: number;
  /** Stars to bump the balloon into, shown one at a time. */
  targets?: KPoint[];
  tip?: KeepyTip;
};
export type Balloon = KPoint & {
  vx: number;
  vy: number;
  lastBop: number;
  color: number;
};
export type KeepyEvent = 'bop' | 'drop' | 'star' | 'win';
export type KeepySim = {
  level: KeepyLevel;
  t: number;
  balloons: Balloon[];
  bops: number;
  drops: number;
  targets: (KPoint & { got: boolean; at: number })[];
  status: 'play' | 'won';
  events: { type: KeepyEvent; balloon: number }[];
};

export const keepyLevels: KeepyLevel[] = [
  // In the lounge room: one very floaty balloon.
  { tip: 'tap', balloons: 1, goal: 5, gravity: 130, bop: 390 },
  { balloons: 1, goal: 8, gravity: 150, bop: 400 },
  {
    tip: 'stars',
    balloons: 1,
    goal: 8,
    gravity: 150,
    bop: 410,
    targets: [
      { x: 120, y: 250 },
      { x: 280, y: 230 },
    ],
  },
  // Two balloons, then stars to chase with them.
  { tip: 'two', balloons: 2, goal: 10, gravity: 130, bop: 400 },
  {
    balloons: 1,
    goal: 12,
    gravity: 175,
    bop: 430,
    targets: [
      { x: 290, y: 220 },
      { x: 100, y: 260 },
      { x: 210, y: 190 },
    ],
  },
  {
    balloons: 2,
    goal: 14,
    gravity: 150,
    bop: 420,
    targets: [
      { x: 200, y: 210 },
      { x: 310, y: 250 },
    ],
  },
  // A breezy afternoon on the verandah.
  { tip: 'wind', balloons: 1, goal: 12, gravity: 170, bop: 430, wind: 80 },
  { balloons: 2, goal: 16, gravity: 160, bop: 430, wind: 60 },
  {
    balloons: 2,
    goal: 20,
    gravity: 180,
    bop: 440,
    wind: 70,
    targets: [
      { x: 100, y: 230 },
      { x: 300, y: 210 },
      { x: 200, y: 260 },
    ],
  },
];
export const KEEPY_PER_WORLD = 3;
export const keepyWorlds = [
  { en: 'Lounge Room', he: 'בסלון' },
  { en: 'Two Balloons!', he: 'שני בלונים!' },
  { en: 'Windy Verandah', he: 'מרפסת סוערת' },
];

export function createKeepy(level: KeepyLevel): KeepySim {
  const starts = level.balloons === 1 ? [200] : [130, 270];
  return {
    level,
    t: 0,
    balloons: starts.map((x, i) => ({
      x,
      y: 200 + i * 60,
      vx: 0,
      vy: 0,
      lastBop: -1,
      color: i,
    })),
    bops: 0,
    drops: 0,
    targets: (level.targets ?? []).map((p) => ({ ...p, got: false, at: 0 })),
    status: 'play',
    events: [],
  };
}
/** The breeze changes direction slowly, like gusts through a window. */
export const windAt = (sim: KeepySim) =>
  (sim.level.wind ?? 0) *
  Math.sin(sim.t * 0.8) *
  (0.7 + 0.3 * Math.sin(sim.t * 2.3));
/** The one star currently waiting to be collected, if any. */
export const activeTarget = (sim: KeepySim) => sim.targets.find((t) => !t.got);

export function stepKeepy(sim: KeepySim) {
  sim.t += KSTEP;
  if (sim.status !== 'play') {
    // Balloons drift gently upward while everyone celebrates.
    for (const b of sim.balloons) {
      b.vy = b.vy * 0.98 - 60 * KSTEP;
      b.y = Math.max(CEILING + BALLOON_R, b.y + b.vy * KSTEP);
    }
    return;
  }
  const wind = windAt(sim);
  sim.balloons.forEach((b, i) => {
    b.vx += wind * KSTEP;
    b.vy += sim.level.gravity * KSTEP;
    const drag = 1 - DRAG * KSTEP;
    b.vx *= drag;
    b.vy *= drag;
    b.x += b.vx * KSTEP;
    b.y += b.vy * KSTEP;
    if (b.x < BALLOON_R) {
      b.x = BALLOON_R;
      b.vx = Math.abs(b.vx) * 0.7;
    }
    if (b.x > KW - BALLOON_R) {
      b.x = KW - BALLOON_R;
      b.vx = -Math.abs(b.vx) * 0.7;
    }
    if (b.y < CEILING + BALLOON_R) {
      b.y = CEILING + BALLOON_R;
      b.vy = Math.abs(b.vy) * 0.5;
    }
    if (b.y > FLOOR - BALLOON_R) {
      // Oh no, the floor! Bounce back up so play carries on.
      b.y = FLOOR - BALLOON_R;
      b.vy = -300;
      sim.drops++;
      sim.events.push({ type: 'drop', balloon: i });
    }
  });
  // Balloons nudge each other apart instead of overlapping.
  for (let i = 0; i < sim.balloons.length; i++)
    for (let j = i + 1; j < sim.balloons.length; j++) {
      const a = sim.balloons[i],
        b = sim.balloons[j];
      const dx = b.x - a.x,
        dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 1;
      const overlap = BALLOON_R * 2 - d;
      if (overlap > 0) {
        const nx = dx / d,
          ny = dy / d;
        a.x -= (nx * overlap) / 2;
        a.y -= (ny * overlap) / 2;
        b.x += (nx * overlap) / 2;
        b.y += (ny * overlap) / 2;
        const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (rel < 0) {
          a.vx += rel * nx;
          a.vy += rel * ny;
          b.vx -= rel * nx;
          b.vy -= rel * ny;
        }
      }
    }
  const target = activeTarget(sim);
  if (target)
    sim.balloons.forEach((b, i) => {
      if (
        !target.got &&
        Math.hypot(b.x - target.x, b.y - target.y) < BALLOON_R + 20
      ) {
        target.got = true;
        target.at = sim.t;
        sim.events.push({ type: 'star', balloon: i });
      }
    });
  if (sim.bops >= sim.level.goal && !activeTarget(sim)) {
    sim.status = 'won';
    sim.events.push({ type: 'win', balloon: -1 });
  }
}
/**
 * Bop the balloon nearest a tap. Tapping its left side sends it right and
 * vice versa, so children can steer toward the stars.
 */
export function bopAt(sim: KeepySim, p: KPoint) {
  if (sim.status !== 'play') return -1;
  let best = -1,
    bestD = Infinity;
  sim.balloons.forEach((b, i) => {
    const d = Math.hypot(b.x - p.x, b.y - p.y);
    if (d < BALLOON_R + TAP_SLOP && d < bestD && sim.t - b.lastBop > COOLDOWN) {
      best = i;
      bestD = d;
    }
  });
  if (best < 0) return -1;
  const b = sim.balloons[best];
  b.vy = -sim.level.bop;
  b.vx = Math.max(-190, Math.min(190, b.vx * 0.3 + (b.x - p.x) * 4.5));
  b.lastBop = sim.t;
  sim.bops++;
  sim.events.push({ type: 'bop', balloon: best });
  return best;
}
/** Stars for a finished level: none dropped = 3, one or two = 2. */
export const keepyStars = (sim: KeepySim) =>
  sim.drops === 0 ? 3 : sim.drops <= 2 ? 2 : 1;

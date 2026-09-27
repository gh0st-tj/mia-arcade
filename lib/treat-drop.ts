/**
 * Bingo’s Biscuit Drop: a small, deterministic rope-physics engine.
 *
 * Everything runs in a fixed 400×720 world at 120 steps per second, so the
 * same actions at the same steps always give the same result. Tests replay
 * each level’s `solution` to prove it can be finished with all three stars.
 */
export const WORLD_W = 400;
export const WORLD_H = 720;
export const STEP = 1 / 120;
export const COOKIE_R = 21;
export const BUBBLE_R = 36;
export const STAR_R = 30;
export const GOAL_R = 42;
/** Bingo leans toward a nearby free biscuit, which widens the timing window for little players. */
const MAGNET_R = 165;
const MAGNET_FORCE = 7000;
export const FAN_RANGE = 330;
const GRAVITY = 1500;
const SEG = 15;
const NODE_INV = 6;
const COOKIE_INV = 0.25;
/** A bubble carries the biscuit strongly, so hanging rope cannot drag it down. */
const BUBBLE_INV = 0.04;
const ITERATIONS = 24;
const DAMPING = 0.997;
const BUBBLE_RISE = 140;
const FAN_FORCE = 2600;
const FAN_STEPS = 40;
const BOUNCE_MIN = 560;
/** A cut rope keeps hanging from the biscuit briefly before it lets go. */
const RELEASE_STEPS = 40;

export type Point = { x: number; y: number };
export type Tip =
  | 'cut'
  | 'swing'
  | 'two'
  | 'bounce'
  | 'bubble'
  | 'pop'
  | 'hook'
  | 'fan';
type Node = { x: number; y: number; px: number; py: number; inv: number };
export type Rope = {
  nodes: Node[];
  /** Index of the removed link, or -1. Link i joins node i to node i+1 (or the biscuit). */
  cut: number;
  cutStep: number;
  released: boolean;
  hook: number;
  /** Rest length of every link. */
  seg: number;
};
export type Action =
  | { at: number; cut: number }
  | { at: number; pop: true }
  | { at: number; fan: number };
export type LevelDef = {
  cookie: Point;
  ropes: { x: number; y: number; length?: number }[];
  goal: Point;
  stars: [Point, Point, Point];
  bubbles?: Point[];
  /** Garden trampolines: centre, tilt in degrees and width. */
  bouncers?: { x: number; y: number; angle: number; width: number }[];
  /** Pegs that grab the biscuit with a new rope when it comes close. */
  hooks?: { x: number; y: number; r: number }[];
  /** Tap-to-blow fans; angle is the blowing direction in degrees. */
  fans?: { x: number; y: number; angle: number }[];
  /** A new idea this level introduces; the game explains it out loud. */
  tip?: Tip;
  /** How far Bingo reaches for the biscuit (1 = normal). Easier levels reach further. */
  reach?: number;
  solution: Action[];
};
export type SimEvent =
  | 'cut'
  | 'star'
  | 'bubble'
  | 'pop'
  | 'boing'
  | 'hook'
  | 'fan'
  | 'win'
  | 'lose';
export type Sim = {
  def: LevelDef;
  step: number;
  cookie: Node;
  ropes: Rope[];
  bubbles: (Point & { state: 'idle' | 'held' | 'popped'; at: number })[];
  stars: (Point & { got: boolean; at: number })[];
  hooks: (Point & { r: number; used: boolean })[];
  bouncers: {
    x: number;
    y: number;
    angle: number;
    width: number;
    hit: number;
  }[];
  fans: (Point & { angle: number; until: number })[];
  held: number;
  status: 'play' | 'won' | 'lost';
  endStep: number;
  events: SimEvent[];
};

const node = (x: number, y: number, inv: number): Node => ({
  x,
  y,
  px: x,
  py: y,
  inv,
});
function makeRope(anchor: Point, to: Point, length: number, hook = -1): Rope {
  const n = Math.max(2, Math.round(length / SEG));
  const nodes = Array.from({ length: n }, (_, i) =>
    node(
      anchor.x + ((to.x - anchor.x) * i) / n,
      anchor.y + ((to.y - anchor.y) * i) / n,
      i === 0 ? 0 : NODE_INV,
    ),
  );
  return {
    nodes,
    cut: -1,
    cutStep: 0,
    released: false,
    hook,
    seg: length / n,
  };
}
export const distance = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.y - b.y);

export function createSim(def: LevelDef): Sim {
  const cookie = node(def.cookie.x, def.cookie.y, COOKIE_INV);
  return {
    def,
    step: 0,
    cookie,
    ropes: def.ropes.map((r) =>
      makeRope(r, def.cookie, r.length ?? distance(r, def.cookie)),
    ),
    bubbles: (def.bubbles ?? []).map((b) => ({ ...b, state: 'idle', at: 0 })),
    stars: def.stars.map((s) => ({ ...s, got: false, at: 0 })),
    hooks: (def.hooks ?? []).map((h) => ({ ...h, used: false })),
    bouncers: (def.bouncers ?? []).map((b) => ({ ...b, hit: -99 })),
    fans: (def.fans ?? []).map((f) => ({ ...f, until: -1 })),
    held: -1,
    status: 'play',
    endStep: 0,
    events: [],
  };
}
/** The biscuit end of a link: the next node, or the biscuit itself. */
const linkEnd = (sim: Sim, rope: Rope, i: number) =>
  i === rope.nodes.length - 1 ? sim.cookie : rope.nodes[i + 1];
export const linkActive = (rope: Rope, i: number) =>
  i !== rope.cut && !(rope.released && i >= rope.cut);
/** Whether a rope still holds the biscuit. */
export const holding = (rope: Rope) => rope.cut < 0;

function integrate(p: Node, ax: number, ay: number, damping = DAMPING) {
  const vx = (p.x - p.px) * damping;
  const vy = (p.y - p.py) * damping;
  p.px = p.x;
  p.py = p.y;
  p.x += vx + ax * STEP * STEP;
  p.y += vy + ay * STEP * STEP;
}
function satisfy(a: Node, b: Node, rest: number) {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const d = Math.hypot(dx, dy);
  const total = a.inv + b.inv;
  if (d <= rest || d === 0 || total === 0) return;
  const k = (d - rest) / d / total;
  a.x += dx * k * a.inv;
  a.y += dy * k * a.inv;
  b.x -= dx * k * b.inv;
  b.y -= dy * k * b.inv;
}
export function bouncerEnds(b: {
  x: number;
  y: number;
  angle: number;
  width: number;
}) {
  const r = (b.angle * Math.PI) / 180;
  const dx = (Math.cos(r) * b.width) / 2,
    dy = (Math.sin(r) * b.width) / 2;
  return [
    { x: b.x - dx, y: b.y - dy },
    { x: b.x + dx, y: b.y + dy },
  ] as const;
}

export function stepSim(sim: Sim) {
  sim.step++;
  const c = sim.cookie;
  for (const rope of sim.ropes)
    for (const n of rope.nodes) if (n.inv) integrate(n, 0, GRAVITY);
  if (sim.status === 'play') {
    let ax = 0,
      ay = GRAVITY;
    const bubble = sim.held >= 0;
    if (bubble) {
      // Blend toward a gentle rise instead of falling.
      const vx = (c.x - c.px) * 0.972,
        vy = (c.y - c.py) * 0.94 - BUBBLE_RISE * STEP * 0.06;
      c.px = c.x - vx;
      c.py = c.y - vy;
      ay = 0;
    }
    for (const f of sim.fans) {
      if (f.until < sim.step) continue;
      const r = (f.angle * Math.PI) / 180;
      const dir = { x: Math.cos(r), y: Math.sin(r) };
      const dx = c.x - f.x,
        dy = c.y - f.y;
      const d = Math.hypot(dx, dy);
      if (d > FAN_RANGE || d < 1) continue;
      const along = (dx * dir.x + dy * dir.y) / d;
      if (along < Math.cos((34 * Math.PI) / 180)) continue;
      const force =
        FAN_FORCE * (1 - (d / FAN_RANGE) * 0.6) * (bubble ? 0.5 : 1);
      ax += dir.x * force;
      ay += dir.y * force;
    }
    const g = sim.def.goal;
    const dg = distance(c, g);
    const reach = sim.def.reach ?? 1;
    const range = MAGNET_R * reach;
    if (dg < range && !bubble && !sim.ropes.some(holding)) {
      const pull = (MAGNET_FORCE * reach * (1 - dg / range)) / Math.max(dg, 1);
      ax += (g.x - c.x) * pull;
      ay += (g.y - c.y) * pull;
    }
    integrate(c, ax, ay, bubble ? 1 : DAMPING);
  }
  for (let it = 0; it < ITERATIONS; it++)
    for (const rope of sim.ropes) {
      for (let i = 0; i < rope.nodes.length; i++) {
        if (!linkActive(rope, i)) continue;
        if (i === rope.nodes.length - 1 && sim.status !== 'play') continue;
        satisfy(rope.nodes[i], linkEnd(sim, rope, i), rope.seg);
      }
    }
  for (const rope of sim.ropes)
    if (
      rope.cut >= 0 &&
      !rope.released &&
      sim.step - rope.cutStep > RELEASE_STEPS
    )
      rope.released = true;
  if (sim.status !== 'play') return;
  for (const b of sim.bouncers) {
    const [a, e] = bouncerEnds(b);
    const lx = e.x - a.x,
      ly = e.y - a.y;
    const t = Math.max(
      0,
      Math.min(1, ((c.x - a.x) * lx + (c.y - a.y) * ly) / (lx * lx + ly * ly)),
    );
    const qx = a.x + lx * t,
      qy = a.y + ly * t;
    const d = Math.hypot(c.x - qx, c.y - qy);
    if (d >= COOKIE_R + 5 || d === 0) continue;
    const nx = (c.x - qx) / d,
      ny = (c.y - qy) / d;
    c.x = qx + nx * (COOKIE_R + 5);
    c.y = qy + ny * (COOKIE_R + 5);
    const vx = c.x - c.px,
      vy = c.y - c.py;
    const vn = vx * nx + vy * ny;
    if (vn < 0) {
      const out = Math.max(-vn * 0.9, BOUNCE_MIN * STEP);
      c.px = c.x - (vx - vn * nx + out * nx);
      c.py = c.y - (vy - vn * ny + out * ny);
      if (sim.step - b.hit > 12) sim.events.push('boing');
      b.hit = sim.step;
    }
  }
  sim.hooks.forEach((h, i) => {
    if (h.used || distance(h, c) > h.r) return;
    h.used = true;
    sim.ropes.push(makeRope(h, c, Math.max(24, distance(h, c)), i));
    sim.events.push('hook');
  });
  sim.bubbles.forEach((b, i) => {
    if (b.state === 'idle' && sim.held < 0 && distance(b, c) < BUBBLE_R) {
      b.state = 'held';
      b.at = sim.step;
      sim.held = i;
      c.inv = BUBBLE_INV;
      sim.events.push('bubble');
    }
    if (b.state === 'held') {
      b.x = c.x;
      b.y = c.y;
    }
  });
  for (const s of sim.stars)
    if (!s.got && distance(s, c) < STAR_R) {
      s.got = true;
      s.at = sim.step;
      sim.events.push('star');
    }
  if (distance(c, sim.def.goal) < GOAL_R) {
    finish(sim, 'won');
    return;
  }
  if (c.x < -70 || c.x > WORLD_W + 70 || c.y > WORLD_H + 60 || c.y < -90)
    finish(sim, 'lost');
}
function finish(sim: Sim, status: 'won' | 'lost') {
  sim.status = status;
  sim.endStep = sim.step;
  sim.events.push(status === 'won' ? 'win' : 'lose');
  // The biscuit is eaten (or gone): every rope lets go of it.
  for (const rope of sim.ropes)
    if (rope.cut < 0) {
      rope.cut = rope.nodes.length - 1;
      rope.cutStep = sim.step;
      rope.released = true;
    }
  if (sim.held >= 0) sim.bubbles[sim.held].state = 'popped';
  sim.held = -1;
}

/** Cut a whole rope (used by hints and tests); picks a link near its middle. */
export function cutRope(sim: Sim, index: number) {
  const rope = sim.ropes[index];
  if (!rope || rope.cut >= 0 || sim.status !== 'play') return false;
  rope.cut = Math.floor((rope.nodes.length - 1) / 2);
  rope.cutStep = sim.step;
  sim.events.push('cut');
  return true;
}
const cross = (ax: number, ay: number, bx: number, by: number) =>
  ax * by - ay * bx;
function intersects(a: Point, b: Point, c: Point, d: Point) {
  const rx = b.x - a.x,
    ry = b.y - a.y,
    sx = d.x - c.x,
    sy = d.y - c.y;
  const den = cross(rx, ry, sx, sy);
  if (Math.abs(den) < 1e-9) return false;
  const t = cross(c.x - a.x, c.y - a.y, sx, sy) / den;
  const u = cross(c.x - a.x, c.y - a.y, rx, ry) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}
/** Cut every rope that a finger stroke from `a` to `b` crosses. */
export function slice(sim: Sim, a: Point, b: Point) {
  if (sim.status !== 'play') return 0;
  let count = 0;
  for (const rope of sim.ropes) {
    if (rope.cut >= 0) continue;
    for (let i = 0; i < rope.nodes.length; i++) {
      if (intersects(a, b, rope.nodes[i], linkEnd(sim, rope, i))) {
        rope.cut = i;
        rope.cutStep = sim.step;
        count++;
        break;
      }
    }
  }
  if (count) sim.events.push('cut');
  return count;
}
/** Little fingers often tap a rope instead of swiping: cut the nearest link within `radius`. */
export function snipNear(sim: Sim, p: Point, radius: number) {
  if (sim.status !== 'play') return false;
  let best: { rope: Rope; i: number; d: number } | null = null;
  for (const rope of sim.ropes) {
    if (rope.cut >= 0) continue;
    for (let i = 0; i < rope.nodes.length; i++) {
      const a = rope.nodes[i],
        b = linkEnd(sim, rope, i);
      const lx = b.x - a.x,
        ly = b.y - a.y;
      const len = lx * lx + ly * ly || 1;
      const t = Math.max(
        0,
        Math.min(1, ((p.x - a.x) * lx + (p.y - a.y) * ly) / len),
      );
      const d = Math.hypot(p.x - (a.x + lx * t), p.y - (a.y + ly * t));
      if (d < radius && (!best || d < best.d)) best = { rope, i, d };
    }
  }
  if (!best) return false;
  best.rope.cut = best.i;
  best.rope.cutStep = sim.step;
  sim.events.push('cut');
  return true;
}
export function pop(sim: Sim) {
  if (sim.held < 0 || sim.status !== 'play') return false;
  const b = sim.bubbles[sim.held];
  b.state = 'popped';
  b.at = sim.step;
  sim.held = -1;
  sim.cookie.inv = COOKIE_INV;
  sim.events.push('pop');
  return true;
}
export function blow(sim: Sim, index: number) {
  const f = sim.fans[index];
  if (!f || sim.status !== 'play') return false;
  f.until = sim.step + FAN_STEPS;
  sim.events.push('fan');
  return true;
}
export function apply(sim: Sim, action: Action) {
  if ('cut' in action) return cutRope(sim, action.cut);
  if ('pop' in action) return pop(sim);
  return blow(sim, action.fan);
}
/** Replay a list of actions until the level ends (or times out). */
export function simulate(
  def: LevelDef,
  actions = def.solution,
  maxSteps = 2400,
) {
  const sim = createSim(def);
  const queue = [...actions].sort((a, b) => a.at - b.at);
  while (sim.status === 'play' && sim.step < maxSteps) {
    while (queue.length && queue[0].at <= sim.step) apply(sim, queue.shift()!);
    stepSim(sim);
  }
  return sim;
}
export const starsGot = (sim: Sim) => sim.stars.filter((s) => s.got).length;

export const worlds = [
  { en: 'Backyard Morning', he: 'בוקר בחצר' },
  { en: 'Bouncy Afternoon', he: 'צהריים קופצניים' },
  { en: 'Sunset Adventure', he: 'הרפתקת שקיעה' },
];
export const LEVELS_PER_WORLD = 5;

const G = (x: number, y = 612): Point => ({ x, y });
const P = (x: number, y: number): Point => ({ x, y });
/**
 * Fifteen levels in three worlds. Bingo reaches further on early levels, so
 * the timing windows start wide and narrow toward a five-year-old challenge.
 * Every `solution` is replayed by the tests and must win with three stars.
 */
export const levels: LevelDef[] = [
  // Backyard Morning: snipping, swinging and choosing which rope goes first.
  {
    tip: 'cut',
    reach: 1.5,
    cookie: P(200, 250),
    ropes: [P(200, 105)],
    goal: G(200),
    stars: [P(200, 345), P(200, 430), P(200, 515)],
    solution: [{ at: 40, cut: 0 }],
  },
  {
    tip: 'swing',
    reach: 1.5,
    cookie: P(135, 210),
    ropes: [P(200, 90)],
    goal: G(200),
    stars: [P(250, 218), P(160, 222), P(150, 370)],
    solution: [{ at: 406, cut: 0 }],
  },
  {
    tip: 'two',
    reach: 1.5,
    cookie: P(200, 240),
    ropes: [P(90, 110), P(310, 110)],
    goal: G(300),
    stars: [P(300, 282), P(372, 266), P(318, 358)],
    solution: [
      { at: 0, cut: 0 },
      { at: 412, cut: 1 },
    ],
  },
  {
    reach: 1.5,
    cookie: P(200, 230),
    ropes: [P(120, 140), P(330, 160), P(200, 80)],
    goal: G(120),
    stars: [P(150, 258), P(72, 250), P(166, 360)],
    solution: [
      { at: 0, cut: 1 },
      { at: 60, cut: 2 },
      { at: 459, cut: 0 },
    ],
  },
  {
    reach: 1.7,
    cookie: P(80, 170),
    ropes: [P(80, 70), { x: 230, y: 60, length: 290 }],
    goal: G(290),
    stars: [P(200, 334), P(375, 312), P(255, 410)],
    solution: [
      { at: 20, cut: 0 },
      { at: 415, cut: 1 },
    ],
  },
  // Bouncy Afternoon: trampolines, bubbles and hooks.
  {
    tip: 'bounce',
    reach: 1.3,
    cookie: P(90, 220),
    ropes: [P(90, 90)],
    bouncers: [{ x: 100, y: 470, angle: 15, width: 120 }],
    goal: G(320),
    stars: [P(90, 303), P(179, 369), P(285, 455)],
    solution: [{ at: 20, cut: 0 }],
  },
  {
    tip: 'bubble',
    reach: 1.3,
    cookie: P(200, 420),
    ropes: [P(200, 300)],
    bubbles: [P(200, 560)],
    goal: G(200, 170),
    stars: [P(200, 500), P(200, 400), P(200, 290)],
    solution: [{ at: 20, cut: 0 }],
  },
  {
    tip: 'pop',
    reach: 1.3,
    cookie: P(100, 420),
    ropes: [P(300, 330)],
    bubbles: [P(100, 420)],
    goal: G(300),
    stars: [P(115, 345), P(200, 132), P(296, 440)],
    solution: [
      { at: 480, pop: true },
      { at: 734, cut: 0 },
    ],
  },
  {
    tip: 'hook',
    reach: 1.3,
    cookie: P(30, 170),
    ropes: [P(130, 90)],
    hooks: [{ x: 240, y: 240, r: 62 }],
    goal: G(240),
    stars: [P(104, 217), P(205, 195), P(205, 380)],
    solution: [
      { at: 220, cut: 0 },
      { at: 667, cut: 1 },
    ],
  },
  {
    reach: 1.2,
    cookie: P(70, 180),
    ropes: [P(70, 70)],
    bouncers: [{ x: 90, y: 450, angle: 18, width: 110 }],
    bubbles: [P(265, 405)],
    goal: G(345, 190),
    stars: [P(70, 330), P(185, 353), P(338, 300)],
    solution: [{ at: 20, cut: 0 }],
  },
  // Sunset Adventure: fans, hook swings and bank shots.
  {
    tip: 'fan',
    reach: 1.15,
    cookie: P(90, 600),
    ropes: [],
    bubbles: [P(90, 600)],
    fans: [{ x: 20, y: 420, angle: -5 }],
    goal: G(250),
    stars: [P(93, 505), P(175, 337), P(200, 280)],
    solution: [
      { at: 170, fan: 0 },
      { at: 400, pop: true },
    ],
  },
  {
    reach: 1.1,
    cookie: P(60, 160),
    ropes: [P(60, 60), { x: 200, y: 60, length: 230 }],
    hooks: [{ x: 330, y: 295, r: 55 }],
    goal: G(330),
    stars: [P(160, 282), P(330, 252), P(322, 380)],
    solution: [
      { at: 10, cut: 0 },
      { at: 260, cut: 1 },
      { at: 727, cut: 2 },
    ],
  },
  {
    reach: 1.1,
    cookie: P(320, 150),
    ropes: [P(320, 60)],
    bouncers: [{ x: 300, y: 430, angle: -15, width: 110 }],
    goal: G(62),
    stars: [P(320, 273), P(216, 327), P(120, 414)],
    solution: [{ at: 10, cut: 0 }],
  },
  {
    reach: 1.05,
    cookie: P(80, 150),
    ropes: [P(80, 60)],
    bouncers: [
      { x: 90, y: 380, angle: 20, width: 100 },
      { x: 340, y: 460, angle: -35, width: 100 },
    ],
    goal: G(90),
    stars: [P(170, 286), P(336, 382), P(192, 396)],
    solution: [{ at: 10, cut: 0 }],
  },
  {
    reach: 1,
    cookie: P(30, 150),
    ropes: [P(120, 60)],
    hooks: [{ x: 220, y: 215, r: 60 }],
    bouncers: [{ x: 220, y: 470, angle: 20, width: 110 }],
    bubbles: [P(315, 395)],
    goal: G(350, 180),
    stars: [P(125, 188), P(274, 241), P(279, 367)],
    solution: [
      { at: 200, cut: 0 },
      { at: 952, cut: 1 },
    ],
  },
];
/** Bingo sits on a perch when her mouth is above the lawn. */
export const perched = (goal: Point) => goal.y < 560;
/** The next thing a hint should point at, following the level’s solution. */
export function nextHint(sim: Sim): Action | null {
  for (const action of sim.def.solution) {
    if ('cut' in action) {
      const rope = sim.ropes[action.cut];
      if (!rope) return action; // A hook rope that has not attached yet.
      if (rope.cut < 0) return action;
    } else if ('pop' in action) {
      if (sim.held >= 0) return action;
      if (sim.bubbles.some((b) => b.state === 'popped')) continue;
      return action;
    } else if (!sim.fans[action.fan] || sim.fans[action.fan].until < 0)
      return action;
  }
  return null;
}

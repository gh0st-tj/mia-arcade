/**
 * Hand-drawn canvas art for the Bluey games: heeler pups, the biscuit,
 * garden props and backyard scenery. Everything is vector paths so it stays
 * crisp on any phone and can be animated (blinks, looking, munching).
 */
export type Ctx = CanvasRenderingContext2D;

// Older phones (before iOS 16) lack roundRect; a plain rounded path is enough here.
if (
  typeof CanvasRenderingContext2D !== 'undefined' &&
  !CanvasRenderingContext2D.prototype.roundRect
) {
  CanvasRenderingContext2D.prototype.roundRect = function (
    x: number,
    y: number,
    w: number,
    h: number,
    radii?: number | DOMPointInit | (number | DOMPointInit)[],
  ) {
    const first = Array.isArray(radii) ? radii[0] : radii;
    const r = Math.min(typeof first === 'number' ? first : 0, w / 2, h / 2);
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
  };
}
export type Palette = {
  fur: string;
  light: string;
  brow: string;
  dark: string;
  nose: string;
};
export const bluey: Palette = {
  fur: '#5e9fe3',
  light: '#f2e6c4',
  brow: '#a9d3f7',
  dark: '#2a4b8d',
  nose: '#1f2540',
};
export const bingo: Palette = {
  fur: '#ec8c55',
  light: '#f8e6c0',
  brow: '#f9cf9e',
  dark: '#a94d27',
  nose: '#3a2320',
};
export type Pose = {
  /** 0 = closed smile, 1 = wide open. */
  mouth?: number;
  /** 0 = open eyes, 1 = shut. */
  blink?: number;
  /** Where the pup looks, each axis -1..1. */
  look?: { x: number; y: number };
  /** Tail wag angle in radians. */
  tail?: number;
  /** Paws raised overhead (for bopping balloons). */
  reach?: number;
  sad?: boolean;
  /** Draw the sitting body under the head. */
  body?: boolean;
  /** Ear tilt, radians. */
  ears?: number;
  blush?: boolean;
};

const ellipse = (
  ctx: Ctx,
  x: number,
  y: number,
  rx: number,
  ry: number,
  fill: string,
  rotation = 0,
) => {
  ctx.beginPath();
  ctx.ellipse(
    x,
    y,
    Math.max(0.1, rx),
    Math.max(0.1, ry),
    rotation,
    0,
    Math.PI * 2,
  );
  ctx.fillStyle = fill;
  ctx.fill();
};
function ear(ctx: Ctx, p: Palette, side: -1 | 1, tilt: number) {
  ctx.save();
  ctx.translate(side * 30, -30);
  ctx.rotate(side * (0.28 + tilt));
  ctx.beginPath();
  ctx.moveTo(-17, 8);
  ctx.quadraticCurveTo(-12, -30, -2, -52);
  ctx.quadraticCurveTo(4, -56, 8, -48);
  ctx.quadraticCurveTo(17, -22, 19, 8);
  ctx.closePath();
  ctx.fillStyle = p.dark;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-9, 4);
  ctx.quadraticCurveTo(-6, -24, 1, -40);
  ctx.quadraticCurveTo(9, -20, 11, 4);
  ctx.closePath();
  ctx.fillStyle = p.brow;
  ctx.globalAlpha = 0.55;
  ctx.fill();
  ctx.restore();
}
/**
 * Draw a heeler pup. (0,0) is the middle of the head; the head is about
 * 100 units wide before `scale`.
 */
export function drawPup(
  ctx: Ctx,
  p: Palette,
  x: number,
  y: number,
  scale: number,
  pose: Pose = {},
) {
  const {
    mouth = 0,
    blink = 0,
    look = { x: 0, y: 0 },
    tail = 0,
    reach = 0,
    sad = false,
    body = true,
    ears = 0,
    blush = true,
  } = pose;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (body) {
    // Soft ground shadow.
    ellipse(ctx, 0, 124, 52, 9, 'rgba(20,30,60,0.18)');
    // Tail.
    ctx.save();
    ctx.translate(30, 96);
    ctx.rotate(-0.5 + tail);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(26, -6, 36, -30);
    ctx.lineWidth = 12;
    ctx.strokeStyle = p.fur;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(30, -18);
    ctx.quadraticCurveTo(34, -24, 36, -30);
    ctx.strokeStyle = p.dark;
    ctx.stroke();
    ctx.restore();
    // Body, belly and haunches.
    ellipse(ctx, 0, 82, 38, 42, p.fur);
    ellipse(ctx, 0, 90, 22, 30, p.light);
    ellipse(ctx, -30, 104, 17, 15, p.fur);
    ellipse(ctx, 30, 104, 17, 15, p.fur);
    ellipse(ctx, -35, 118, 14, 7, p.light);
    ellipse(ctx, 35, 118, 14, 7, p.light);
    // Back patch.
    ctx.beginPath();
    ctx.ellipse(-24, 66, 10, 16, -0.4, 0, Math.PI * 2);
    ctx.fillStyle = p.dark;
    ctx.globalAlpha = 0.5;
    ctx.fill();
    ctx.globalAlpha = 1;
    // Front legs: down to the ground, or up for a bop.
    for (const side of [-1, 1] as const) {
      ctx.save();
      ctx.translate(side * 16, 70);
      ctx.rotate(side * reach * 2.5);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 44);
      ctx.lineWidth = 14;
      ctx.strokeStyle = p.fur;
      ctx.stroke();
      ellipse(ctx, 0, 47, 9, 6.5, p.light);
      ctx.restore();
    }
  }
  // Head.
  ear(ctx, p, -1, ears);
  ear(ctx, p, 1, -ears);
  ctx.beginPath();
  ctx.moveTo(-50, 6);
  ctx.bezierCurveTo(-54, -34, -26, -46, 0, -46);
  ctx.bezierCurveTo(26, -46, 54, -34, 50, 6);
  ctx.bezierCurveTo(47, 34, 26, 44, 0, 44);
  ctx.bezierCurveTo(-26, 44, -47, 34, -50, 6);
  ctx.fillStyle = p.fur;
  ctx.fill();
  // Dark crown patch.
  ctx.beginPath();
  ctx.moveTo(-22, -43);
  ctx.quadraticCurveTo(0, -34, 22, -43);
  ctx.quadraticCurveTo(0, -48, -22, -43);
  ctx.fillStyle = p.dark;
  ctx.globalAlpha = 0.55;
  ctx.fill();
  ctx.globalAlpha = 1;
  // Eyebrows and muzzle.
  ellipse(ctx, -20, -20, 9, 5.5, p.brow, -0.15);
  ellipse(ctx, 20, -20, 9, 5.5, p.brow, 0.15);
  ctx.beginPath();
  ctx.moveTo(-34, 22);
  ctx.bezierCurveTo(-36, 2, -14, -2, 0, 2);
  ctx.bezierCurveTo(14, -2, 36, 2, 34, 22);
  ctx.bezierCurveTo(30, 42, -30, 42, -34, 22);
  ctx.fillStyle = p.light;
  ctx.fill();
  // Cheeks.
  if (blush) {
    ellipse(ctx, -34, 14, 7, 4.5, 'rgba(255,120,140,0.28)');
    ellipse(ctx, 34, 14, 7, 4.5, 'rgba(255,120,140,0.28)');
  }
  // Eyes follow `look` and blink.
  const lx = look.x * 2.6,
    ly = look.y * 2.4;
  for (const side of [-1, 1]) {
    const ex = side * 20 + lx,
      ey = -6 + ly;
    const open = 1 - blink;
    if (open < 0.15) {
      ctx.beginPath();
      ctx.moveTo(ex - 6, ey);
      ctx.quadraticCurveTo(ex, ey + 4, ex + 6, ey);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = p.nose;
      ctx.stroke();
    } else {
      ellipse(ctx, ex, ey, 6.5, 8.5 * open, p.nose);
      ellipse(ctx, ex + 2, ey - 3 * open, 2.2, 2.6 * open, '#fff');
    }
    if (sad) {
      ctx.beginPath();
      ctx.moveTo(side * 12, -19);
      ctx.lineTo(side * 28, -24);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = p.dark;
      ctx.stroke();
    }
  }
  // Mouth.
  if (mouth > 0.08) {
    const h = 5 + mouth * 17;
    ctx.beginPath();
    ctx.ellipse(0, 22 + h / 2, 12 + mouth * 4, h / 2 + 2, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#5b1a24';
    ctx.fill();
    ctx.save();
    ctx.clip();
    ellipse(ctx, 0, 24 + h, 10, 7, '#ff8fa3');
    ctx.restore();
  } else {
    ctx.beginPath();
    if (sad) {
      ctx.moveTo(-9, 28);
      ctx.quadraticCurveTo(0, 21, 9, 28);
    } else {
      ctx.moveTo(-11, 20);
      ctx.quadraticCurveTo(-5, 28, 0, 21);
      ctx.quadraticCurveTo(5, 28, 11, 20);
    }
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = p.nose;
    ctx.stroke();
  }
  // Nose on top of the mouth.
  ctx.beginPath();
  ctx.moveTo(-9, 10);
  ctx.quadraticCurveTo(0, 5, 9, 10);
  ctx.quadraticCurveTo(9, 18, 0, 20);
  ctx.quadraticCurveTo(-9, 18, -9, 10);
  ctx.fillStyle = p.nose;
  ctx.fill();
  ellipse(ctx, -3, 10, 3, 1.6, 'rgba(255,255,255,0.55)');
  ctx.restore();
}

/** A round chocolate-chip biscuit with sprinkles. */
export function drawBiscuit(
  ctx: Ctx,
  x: number,
  y: number,
  r: number,
  spin = 0,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(spin);
  ellipse(ctx, 0, r * 0.25, r * 1.02, r * 0.95, 'rgba(90,50,20,0.25)');
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
  g.addColorStop(0, '#f7cf86');
  g.addColorStop(1, '#d99746');
  ellipse(ctx, 0, 0, r, r, '#b87333');
  ellipse(ctx, 0, -1, r * 0.92, r * 0.9, g as unknown as string);
  const chips = [
    [-0.4, -0.3],
    [0.35, -0.4],
    [0.1, 0.1],
    [-0.3, 0.4],
    [0.45, 0.35],
  ];
  for (const [cx, cy] of chips)
    ellipse(ctx, cx * r, cy * r, r * 0.13, r * 0.11, '#6b3a1f');
  const sprinkles = ['#ff7eb6', '#7fd6ff', '#ffe066', '#9ef0a8'];
  sprinkles.forEach((color, i) => {
    const a = i * 1.6 + 0.5;
    ctx.save();
    ctx.translate(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.5);
    ctx.rotate(a);
    ctx.fillStyle = color;
    ctx.fillRect(-r * 0.12, -r * 0.035, r * 0.24, r * 0.07);
    ctx.restore();
  });
  ctx.restore();
}

export function starPath(ctx: Ctx, x: number, y: number, r: number, rot = 0) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot - Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.48 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}
export function drawStar(
  ctx: Ctx,
  x: number,
  y: number,
  r: number,
  t: number,
  alpha = 1,
) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 2);
  glow.addColorStop(0, 'rgba(255,236,140,0.55)');
  glow.addColorStop(1, 'rgba(255,236,140,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x - r * 2, y - r * 2, r * 4, r * 4);
  starPath(ctx, x, y, r, Math.sin(t * 2) * 0.15);
  ctx.fillStyle = '#ffd23f';
  ctx.fill();
  ctx.lineWidth = r * 0.14;
  ctx.strokeStyle = '#f29e1f';
  ctx.stroke();
  starPath(ctx, x - r * 0.12, y - r * 0.15, r * 0.45, Math.sin(t * 2) * 0.15);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fill();
  ctx.restore();
}
export function drawBubble(
  ctx: Ctx,
  x: number,
  y: number,
  r: number,
  t: number,
) {
  ctx.save();
  const wob = Math.sin(t * 5) * 0.04;
  ctx.translate(x, y);
  ctx.scale(1 + wob, 1 - wob);
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.2, 0, 0, r);
  g.addColorStop(0, 'rgba(255,255,255,0.08)');
  g.addColorStop(0.75, 'rgba(160,220,255,0.18)');
  g.addColorStop(1, 'rgba(200,170,255,0.55)');
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.72, -2.4, -1.5);
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.stroke();
  ctx.restore();
}
/** A garden trampoline seen side-on, from end `a` to end `b`. */
export function drawTrampoline(
  ctx: Ctx,
  a: { x: number; y: number },
  b: { x: number; y: number },
  squash: number,
) {
  const dx = b.x - a.x,
    dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  ctx.save();
  ctx.translate(a.x, a.y);
  ctx.rotate(Math.atan2(dy, dx));
  // Legs.
  ctx.strokeStyle = '#3b6fb6';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  for (const lx of [8, len - 8]) {
    ctx.beginPath();
    ctx.moveTo(lx, 4);
    ctx.lineTo(lx + (lx < len / 2 ? -6 : 6), 26);
    ctx.stroke();
  }
  // Springs from the frame to the mat.
  const dip = 10 * squash;
  ctx.strokeStyle = '#9aa7b8';
  ctx.lineWidth = 1.6;
  for (let sx = 14; sx < len - 10; sx += 10) {
    const k = sx / len;
    const my = 4 * k * (1 - k) * dip;
    ctx.beginPath();
    ctx.moveTo(sx, 6);
    ctx.lineTo(sx + 3, my + 1);
    ctx.stroke();
  }
  // Blue frame tube.
  ctx.beginPath();
  ctx.moveTo(0, 7);
  ctx.lineTo(len, 7);
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#3b6fb6';
  ctx.stroke();
  // Springy mat that dips when bounced.
  ctx.beginPath();
  ctx.moveTo(6, 0);
  ctx.quadraticCurveTo(len / 2, dip * 2, len - 6, 0);
  ctx.lineWidth = 7;
  ctx.strokeStyle = '#26263a';
  ctx.stroke();
  // Green safety padding at both ends.
  ctx.lineWidth = 10;
  ctx.strokeStyle = '#2f9e6e';
  ctx.beginPath();
  ctx.moveTo(-4, 2);
  ctx.lineTo(12, 2);
  ctx.moveTo(len - 12, 2);
  ctx.lineTo(len + 4, 2);
  ctx.stroke();
  ctx.restore();
}
export function drawPeg(ctx: Ctx, x: number, y: number, r = 9) {
  ellipse(ctx, x, y + 2, r, r, 'rgba(60,30,10,0.25)');
  ellipse(ctx, x, y, r, r, '#b7793d');
  ellipse(ctx, x, y, r * 0.55, r * 0.55, '#e9b36b');
  ellipse(ctx, x - r * 0.2, y - r * 0.25, r * 0.2, r * 0.2, '#fff5');
}
/** A little handheld fan pointing along `angle` (degrees). */
export function drawFan(
  ctx: Ctx,
  x: number,
  y: number,
  angle: number,
  t: number,
  blowing: boolean,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((angle * Math.PI) / 180);
  // Handle and body.
  ctx.fillStyle = '#ff8fb8';
  ctx.beginPath();
  ctx.roundRect(-26, -9, 22, 18, 7);
  ctx.fill();
  ctx.fillStyle = '#ffd1e2';
  ctx.beginPath();
  ctx.roundRect(-6, -22, 12, 44, 6);
  ctx.fill();
  // Spinning blades.
  const spin = t * (blowing ? 40 : 3);
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 3; i++) {
    const a = spin + (i * Math.PI * 2) / 3;
    ctx.beginPath();
    ctx.ellipse(
      8,
      Math.sin(a) * 12,
      4,
      9 * Math.abs(Math.cos(a)) + 2,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  if (blowing) {
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const off = ((t * 300 + i * 60) % 220) + 20;
      const yy = (i - 1.5) * 14;
      ctx.globalAlpha = 1 - off / 240;
      ctx.beginPath();
      ctx.moveTo(off, yy);
      ctx.quadraticCurveTo(off + 16, yy - 6, off + 32, yy);
      ctx.stroke();
    }
  }
  ctx.restore();
}
/** Dashed reach circle around a hook, with the peg in the middle. */
export function drawHook(
  ctx: Ctx,
  x: number,
  y: number,
  r: number,
  used: boolean,
  t: number,
) {
  if (!used) {
    ctx.save();
    ctx.setLineDash([6, 8]);
    ctx.lineDashOffset = -t * 20;
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  drawPeg(ctx, x, y, 10);
}

function cloud(ctx: Ctx, x: number, y: number, s: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 22 * s, 0, Math.PI * 2);
  ctx.arc(x + 26 * s, y - 10 * s, 26 * s, 0, Math.PI * 2);
  ctx.arc(x + 54 * s, y, 20 * s, 0, Math.PI * 2);
  ctx.roundRect(x - 4 * s, y - 4 * s, 62 * s, 24 * s, 12 * s);
  ctx.fill();
}
export type Scene = {
  sky: [string, string];
  hills: string;
  grass: string;
  sun: string;
  dusk?: boolean;
};
export const scenes: Scene[] = [
  {
    sky: ['#7cc8f7', '#dff4ff'],
    hills: '#9fd98b',
    grass: '#6cc36a',
    sun: '#ffe68a',
  },
  {
    sky: ['#62aef0', '#ffe8c6'],
    hills: '#b5d98a',
    grass: '#7cc464',
    sun: '#ffd166',
  },
  {
    sky: ['#6f6fd0', '#ffb68a'],
    hills: '#7d9f7a',
    grass: '#5c9e62',
    sun: '#ff9f6b',
    dusk: true,
  },
];
/**
 * Paint the backyard across the whole canvas. `x0..x1`/`y0..y1` is the
 * visible area in world units, which can be wider or taller than 400×720.
 */
export function drawBackyard(
  ctx: Ctx,
  scene: Scene,
  view: { x0: number; y0: number; x1: number; y1: number },
) {
  const { x0, y0, x1, y1 } = view;
  const sky = ctx.createLinearGradient(0, y0, 0, 640);
  sky.addColorStop(0, scene.sky[0]);
  sky.addColorStop(1, scene.sky[1]);
  ctx.fillStyle = sky;
  ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  // Sun and soft rays.
  const sunX = scene.dusk ? 300 : 330,
    sunY = scene.dusk ? 470 : 90;
  const halo = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 140);
  halo.addColorStop(0, scene.sun);
  halo.addColorStop(0.3, scene.sun + '88');
  halo.addColorStop(1, scene.sun + '00');
  ctx.fillStyle = halo;
  ctx.fillRect(sunX - 140, sunY - 140, 280, 280);
  ellipse(ctx, sunX, sunY, 34, 34, scene.sun);
  if (scene.dusk) {
    ctx.fillStyle = '#fff';
    for (const [sx, sy, r] of [
      [40, 60, 1.6],
      [120, 30, 1.2],
      [210, 80, 1.8],
      [260, 24, 1.1],
      [360, 150, 1.4],
      [80, 170, 1.2],
    ])
      ellipse(ctx, sx, sy, r, r, 'rgba(255,255,255,0.8)');
  }
  const cloudColor = scene.dusk
    ? 'rgba(255,214,230,0.75)'
    : 'rgba(255,255,255,0.9)';
  cloud(ctx, 30, 150, 0.9, cloudColor);
  cloud(ctx, 250, 230, 0.7, cloudColor);
  cloud(ctx, x0 - 20, 330, 0.8, cloudColor);
  // Distant hills.
  ctx.fillStyle = scene.hills;
  ctx.beginPath();
  ctx.moveTo(x0, 600);
  ctx.bezierCurveTo(60, 520, 140, 540, 200, 575);
  ctx.bezierCurveTo(260, 520, 350, 510, x1, 560);
  ctx.lineTo(x1, y1);
  ctx.lineTo(x0, y1);
  ctx.fill();
  // The Heelers' house on stilts, peeking in from the left.
  ctx.save();
  ctx.globalAlpha = scene.dusk ? 0.85 : 0.95;
  ctx.fillStyle = '#e9f1f5';
  ctx.fillRect(x0 - 10, 505, 120 - x0, 70);
  ctx.fillStyle = '#c64f45';
  ctx.beginPath();
  ctx.moveTo(x0 - 20, 510);
  ctx.lineTo(70, 470);
  ctx.lineTo(130, 510);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#7fb8d8';
  ctx.fillRect(30, 522, 26, 26);
  ctx.fillRect(74, 522, 26, 26);
  ctx.fillStyle = '#fff';
  ctx.fillRect(42, 522, 2, 26);
  ctx.fillRect(86, 522, 2, 26);
  ctx.fillStyle = '#d6c5a4';
  for (const sx of [10, 50, 95]) ctx.fillRect(sx, 575, 6, 40);
  if (scene.dusk) {
    ctx.fillStyle = 'rgba(255,221,120,0.9)';
    ctx.fillRect(32, 524, 22, 22);
  }
  ctx.restore();
  // Wooden fence.
  ctx.fillStyle = scene.dusk ? '#b98d63' : '#d9ae7c';
  for (let fx = Math.floor(x0 / 22) * 22; fx < x1; fx += 22) {
    ctx.beginPath();
    ctx.roundRect(fx + 2, 586, 16, 50, [7, 7, 0, 0]);
    ctx.fill();
  }
  ctx.fillRect(x0, 600, x1 - x0, 6);
  // Lawn.
  const grass = ctx.createLinearGradient(0, 630, 0, y1);
  grass.addColorStop(0, scene.grass);
  grass.addColorStop(1, '#3f8f4c');
  ctx.fillStyle = grass;
  ctx.beginPath();
  ctx.moveTo(x0, 640);
  ctx.quadraticCurveTo(200, 622, x1, 640);
  ctx.lineTo(x1, y1);
  ctx.lineTo(x0, y1);
  ctx.fill();
  // Little flowers.
  for (const [fx, fy, c] of [
    [30, 668, '#ff9fc8'],
    [150, 690, '#ffe066'],
    [270, 672, '#ffffff'],
    [360, 695, '#ff9fc8'],
  ] as const) {
    for (let i = 0; i < 5; i++)
      ellipse(
        ctx,
        fx + Math.cos(i * 1.26) * 4,
        fy + Math.sin(i * 1.26) * 4,
        3,
        3,
        c,
      );
    ellipse(ctx, fx, fy, 2.2, 2.2, '#ffb703');
  }
}
/** A wooden cubby platform for Bingo when she waits up high. */
export function drawPerch(ctx: Ctx, x: number, top: number) {
  ctx.save();
  ctx.fillStyle = 'rgba(40,30,20,0.18)';
  ctx.fillRect(x - 58, top + 6, 116, 10);
  ctx.fillStyle = '#b8834f';
  ctx.beginPath();
  ctx.roundRect(x - 60, top, 120, 16, 6);
  ctx.fill();
  ctx.fillStyle = '#d9a66b';
  ctx.fillRect(x - 56, top + 3, 112, 4);
  ctx.strokeStyle = '#8c5e33';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(x - 44, top + 16);
  ctx.lineTo(x - 30, top + 60);
  ctx.moveTo(x + 44, top + 16);
  ctx.lineTo(x + 30, top + 60);
  ctx.stroke();
  ctx.restore();
}

export const balloonColors = [
  ['#ff6f91', '#c2185b'],
  ['#ffd23f', '#e0a100'],
  ['#9b8cff', '#5b4bd1'],
];
/** A shiny party balloon with a wiggly string. */
export function drawBalloon(
  ctx: Ctx,
  x: number,
  y: number,
  r: number,
  color: number,
  t: number,
  vx: number,
  squash = 0,
) {
  const [light, dark] = balloonColors[color % balloonColors.length];
  ctx.save();
  ctx.translate(x, y);
  // String.
  ctx.beginPath();
  ctx.moveTo(0, r * 1.12);
  for (let i = 1; i <= 6; i++)
    ctx.lineTo(Math.sin(t * 4 + i) * 4 - vx * 0.03 * i, r * 1.12 + i * 11);
  ctx.strokeStyle = 'rgba(80,80,90,0.7)';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.scale(1 + squash * 0.18, 1 - squash * 0.18);
  const g = ctx.createRadialGradient(
    -r * 0.35,
    -r * 0.4,
    r * 0.1,
    0,
    0,
    r * 1.15,
  );
  g.addColorStop(0, light);
  g.addColorStop(1, dark);
  ctx.beginPath();
  ctx.moveTo(0, -r * 1.05);
  ctx.bezierCurveTo(r * 1.05, -r * 1.05, r * 1.02, r * 0.6, 0, r * 1.08);
  ctx.bezierCurveTo(-r * 1.02, r * 0.6, -r * 1.05, -r * 1.05, 0, -r * 1.05);
  ctx.fillStyle = g;
  ctx.fill();
  // Knot.
  ctx.beginPath();
  ctx.moveTo(-5, r * 1.16);
  ctx.lineTo(5, r * 1.16);
  ctx.lineTo(0, r * 1.04);
  ctx.closePath();
  ctx.fillStyle = dark;
  ctx.fill();
  // Shine.
  ctx.beginPath();
  ctx.ellipse(-r * 0.38, -r * 0.45, r * 0.17, r * 0.3, -0.5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fill();
  ctx.restore();
}

/** The Heelers’ lounge room (or the verandah for the windy levels). */
export function drawLounge(
  ctx: Ctx,
  view: { x0: number; y0: number; x1: number; y1: number },
  verandah: boolean,
) {
  const { x0, y0, x1, y1 } = view;
  const floor = 640;
  if (verandah) {
    const sky = ctx.createLinearGradient(0, y0, 0, floor);
    sky.addColorStop(0, '#6fb8f2');
    sky.addColorStop(1, '#d8f0ff');
    ctx.fillStyle = sky;
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    cloud(ctx, 40, 120, 1, 'rgba(255,255,255,0.9)');
    cloud(ctx, 260, 80, 0.8, 'rgba(255,255,255,0.9)');
    // Big leafy tree in the garden.
    ctx.fillStyle = '#6a4a2f';
    ctx.fillRect(318, 330, 18, 260);
    for (const [cx, cy, r, c] of [
      [300, 320, 62, '#5fae5a'],
      [350, 290, 56, '#6cc36a'],
      [330, 360, 58, '#4f9d4f'],
      [x1 - 10, 330, 50, '#5fae5a'],
    ] as const)
      ellipse(ctx, cx, cy, r, r * 0.9, c);
    // Roof edge and posts.
    ctx.fillStyle = '#e9f1f5';
    ctx.fillRect(x0, y0, x1 - x0, 42 - y0);
    ctx.fillStyle = '#c64f45';
    ctx.fillRect(x0, 30, x1 - x0, 12);
    ctx.fillStyle = '#f5efe2';
    ctx.fillRect(12, 42, 16, floor - 42);
    ctx.fillRect(372, 42, 16, floor - 42);
    // Railing.
    ctx.fillStyle = '#f5efe2';
    ctx.fillRect(x0, 548, x1 - x0, 10);
    for (let rx = Math.floor(x0 / 18) * 18; rx < x1; rx += 18)
      ctx.fillRect(rx, 558, 6, floor - 558);
    // Hanging pot plant.
    ctx.strokeStyle = '#8b6b4a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(80, 42);
    ctx.lineTo(80, 96);
    ctx.stroke();
    ellipse(ctx, 80, 110, 20, 14, '#d9774b');
    ellipse(ctx, 70, 96, 14, 9, '#5fae5a');
    ellipse(ctx, 90, 94, 14, 9, '#6cc36a');
  } else {
    const wall = ctx.createLinearGradient(0, y0, 0, floor);
    wall.addColorStop(0, '#fbe9c3');
    wall.addColorStop(1, '#f3d49c');
    ctx.fillStyle = wall;
    ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    // Window with the garden outside.
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(214, 150, 150, 190, 10);
    ctx.fill();
    const out = ctx.createLinearGradient(0, 160, 0, 330);
    out.addColorStop(0, '#8fd3ff');
    out.addColorStop(1, '#c9f0c0');
    ctx.fillStyle = out;
    ctx.fillRect(224, 160, 130, 170);
    ellipse(ctx, 330, 250, 34, 30, '#b48ee6');
    ellipse(ctx, 300, 272, 30, 26, '#c9a4f2');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(286, 160, 6, 170);
    ctx.fillRect(224, 242, 130, 6);
    // Curtains.
    ctx.fillStyle = '#ffb3a1';
    ctx.beginPath();
    ctx.moveTo(200, 140);
    ctx.quadraticCurveTo(226, 250, 206, 360);
    ctx.lineTo(196, 360);
    ctx.lineTo(196, 140);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(378, 140);
    ctx.quadraticCurveTo(352, 250, 372, 360);
    ctx.lineTo(382, 360);
    ctx.lineTo(382, 140);
    ctx.fill();
    // Family pictures.
    for (const [px, py, w, h, c] of [
      [40, 170, 64, 50, '#9fd3f7'],
      [120, 150, 46, 60, '#ffd08a'],
      [52, 250, 50, 40, '#bfe6b0'],
    ] as const) {
      ctx.fillStyle = '#8c5e33';
      ctx.fillRect(px - 4, py - 4, w + 8, h + 8);
      ctx.fillStyle = c;
      ctx.fillRect(px, py, w, h);
    }
    // Lamp.
    ctx.fillStyle = '#6b5a4a';
    ctx.fillRect(372, 470, 5, 170);
    ctx.fillStyle = '#ffe3a3';
    ctx.beginPath();
    ctx.moveTo(356, 470);
    ctx.lineTo(394, 470);
    ctx.lineTo(384, 436);
    ctx.lineTo(366, 436);
    ctx.fill();
    // Couch.
    ctx.fillStyle = '#3aa9a0';
    ctx.beginPath();
    ctx.roundRect(x0 - 20, 520, 170 - x0, 60, 16);
    ctx.fill();
    ctx.fillStyle = '#2f8f88';
    ctx.beginPath();
    ctx.roundRect(x0 - 20, 570, 180 - x0, 60, 14);
    ctx.fill();
    ctx.fillStyle = '#48c0b6';
    ctx.beginPath();
    ctx.roundRect(140, 552, 34, 78, 14);
    ctx.fill();
    ellipse(ctx, 60, 548, 22, 18, '#ffd23f');
  }
  // Floorboards.
  const wood = ctx.createLinearGradient(0, floor, 0, y1);
  wood.addColorStop(0, '#c98b52');
  wood.addColorStop(1, '#a8703f');
  ctx.fillStyle = wood;
  ctx.fillRect(x0, floor, x1 - x0, y1 - floor);
  ctx.fillStyle = 'rgba(90,50,20,0.25)';
  for (let fy = floor + 22; fy < y1; fy += 24) ctx.fillRect(x0, fy, x1 - x0, 2);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(x0, floor, x1 - x0, 4);
  if (!verandah) {
    // Rug.
    ellipse(ctx, 200, 676, 150, 22, '#e86f6f');
    ellipse(ctx, 200, 676, 128, 16, '#f7b267');
  }
}

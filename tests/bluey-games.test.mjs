import test from 'node:test';
import assert from 'node:assert/strict';
import {
  levels,
  simulate,
  starsGot,
  createSim,
  stepSim,
  slice,
  snipNear,
  pop,
  nextHint,
  cutRope,
  distance,
  WORLD_W,
  WORLD_H,
  GOAL_R,
  STAR_R,
  LEVELS_PER_WORLD,
  worlds,
} from '../lib/treat-drop.ts';
import {
  keepyLevels,
  createKeepy,
  stepKeepy,
  bopAt,
  activeTarget,
  keepyStars,
  FLOOR,
  BALLOON_R,
  KEEPY_PER_WORLD,
  keepyWorlds,
} from '../lib/keepy-uppy.ts';
import {
  arcadeStars,
  loadLevels,
  recordLevel,
  saveLevels,
} from '../lib/bluey-progress.ts';
import { games, lobbySections, blueyGames } from '../lib/game-data.ts';

const run = (sim, steps) => {
  for (let i = 0; i < steps; i++) stepSim(sim);
};

test('every Biscuit Drop level can be finished with all three stars', () => {
  assert.equal(levels.length, worlds.length * LEVELS_PER_WORLD);
  levels.forEach((level, i) => {
    const sim = simulate(level);
    assert.equal(sim.status, 'won', `level ${i + 1}`);
    assert.equal(starsGot(sim), 3, `level ${i + 1} stars`);
  });
});

test('stars sit on screen and away from Bingo’s mouth', () => {
  levels.forEach((level, i) => {
    for (const s of level.stars) {
      assert.ok(s.x >= 25 && s.x <= WORLD_W - 25, `level ${i + 1} star x`);
      assert.ok(s.y >= 40 && s.y <= WORLD_H - 140, `level ${i + 1} star y`);
      assert.ok(distance(s, level.goal) > GOAL_R + STAR_R, `level ${i + 1}`);
    }
    assert.ok(
      distance(level.cookie, level.goal) > 120,
      `level ${i + 1} is not already solved`,
    );
  });
});

test('doing nothing never wins by itself', () => {
  levels.forEach((level, i) => {
    const idle = simulate(level, [], 1200);
    assert.notEqual(idle.status, 'won', `level ${i + 1}`);
  });
});

test('no level needs split-second timing, and the first world is gentlest', () => {
  // Share of final-action timings (over five seconds) that still feed Bingo.
  const forgiveness = (level) => {
    const last = level.solution.at(-1);
    const earlier = level.solution.slice(0, -1);
    const start = earlier.length ? earlier.at(-1).at + 5 : 0;
    let wins = 0,
      total = 0;
    for (let at = start; at < start + 600; at += 10) {
      total++;
      if (simulate(level, [...earlier, { ...last, at }]).status === 'won')
        wins++;
    }
    return wins / total;
  };
  const shares = levels.map(forgiveness);
  shares.forEach((share, i) =>
    assert.ok(share >= 0.4, `level ${i + 1}: ${share}`),
  );
  const first = shares.slice(0, LEVELS_PER_WORLD);
  assert.ok(first.reduce((a, b) => a + b) / first.length >= 0.6);
});

test('a finger stroke across a rope cuts it, and a tap near it also snips', () => {
  const sim = createSim(levels[0]);
  assert.equal(slice(sim, { x: 150, y: 180 }, { x: 250, y: 180 }), 1);
  assert.ok(sim.ropes[0].cut >= 0);
  run(sim, 400);
  assert.equal(sim.status, 'won');

  const tapped = createSim(levels[0]);
  assert.equal(snipNear(tapped, { x: 210, y: 180 }, 16), true);
  assert.equal(snipNear(createSim(levels[0]), { x: 300, y: 180 }, 16), false);
});

test('a stroke that misses every rope changes nothing', () => {
  const sim = createSim(levels[2]);
  assert.equal(slice(sim, { x: 10, y: 600 }, { x: 390, y: 600 }), 0);
  assert.ok(sim.ropes.every((r) => r.cut < 0));
});

test('bubbles carry the biscuit up and popping drops it', () => {
  const sim = createSim(levels[7]);
  run(sim, 5);
  assert.equal(sim.held, 0);
  const startY = sim.cookie.y;
  run(sim, 120);
  assert.ok(sim.cookie.y < startY - 40, 'the bubble rises');
  assert.equal(pop(sim), true);
  assert.equal(sim.held, -1);
  const poppedY = sim.cookie.y;
  run(sim, 60);
  assert.ok(sim.cookie.y > poppedY, 'the biscuit falls again');
});

test('hints follow the solution one step at a time', () => {
  const sim = createSim(levels[2]);
  assert.deepEqual(nextHint(sim), levels[2].solution[0]);
  cutRope(sim, 0);
  assert.deepEqual(nextHint(sim), levels[2].solution[1]);
  cutRope(sim, 1);
  assert.equal(nextHint(sim), null);
});

test('a biscuit that falls away is lost, not eaten', () => {
  const sim = simulate(
    levels[2],
    [
      { at: 0, cut: 0 },
      { at: 80, cut: 1 },
    ],
    1500,
  );
  assert.equal(sim.status, 'lost');
  assert.ok(sim.events.includes('lose'));
});

// A patient robot player: bop falling balloons, steering toward stars.
function autoplay(level) {
  const sim = createKeepy(level);
  while (sim.status === 'play' && sim.t < 120) {
    stepKeepy(sim);
    const target = activeTarget(sim);
    for (const b of sim.balloons) {
      const low = Math.min(480, target ? target.y + 250 : 480);
      if (b.vy > 0 && b.y > low) {
        const dir = target
          ? Math.sign(target.x - b.x) *
            Math.min(1, Math.abs(target.x - b.x) / 120)
          : (200 - b.x) / 200;
        bopAt(sim, { x: b.x - dir * 30, y: b.y + 10 });
      }
    }
  }
  return sim;
}

test('every Keepy Uppy level can be won without the balloon touching the floor', () => {
  assert.equal(keepyLevels.length, keepyWorlds.length * KEEPY_PER_WORLD);
  keepyLevels.forEach((level, i) => {
    const sim = autoplay(level);
    assert.equal(sim.status, 'won', `level ${i + 1}`);
    assert.equal(sim.drops, 0, `level ${i + 1}`);
    assert.equal(keepyStars(sim), 3);
  });
});

test('taps bop the nearest balloon and steer it away from the finger', () => {
  const sim = createKeepy(keepyLevels[0]);
  const b = sim.balloons[0];
  assert.equal(bopAt(sim, { x: b.x - 20, y: b.y }), 0);
  assert.ok(b.vy < 0 && b.vx > 0, 'tapping the left side sends it right');
  assert.equal(sim.bops, 1);
  assert.equal(bopAt(sim, { x: b.x, y: b.y }), -1, 'no double bop');
  assert.equal(bopAt(sim, { x: 20, y: 700 }), -1, 'a far tap misses');
});

test('a balloon that reaches the floor bounces back and costs stars only', () => {
  const sim = createKeepy(keepyLevels[0]);
  while (!sim.drops) stepKeepy(sim);
  assert.ok(sim.balloons[0].y <= FLOOR - BALLOON_R);
  assert.ok(sim.balloons[0].vy < 0);
  assert.equal(keepyStars(sim), 2);
  sim.drops = 3;
  assert.equal(keepyStars(sim), 1);
  assert.equal(sim.status, 'play');
});

test('level progress keeps the best result and awards a star per world', () => {
  let saved = Array(15).fill(0);
  saved = recordLevel(saved, 0, 2);
  saved = recordLevel(saved, 0, 1);
  assert.equal(saved[0], 2);
  assert.equal(recordLevel(saved, 1, 0)[1], 1, 'finishing earns at least one');
  assert.equal(arcadeStars(saved, 5), 0);
  assert.equal(arcadeStars(Array(15).fill(1), 5), 3);
  assert.equal(
    arcadeStars([1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1], 5),
    2,
  );
});

test('saved progress is read back safely', () => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, String(v)),
  };
  try {
    assert.deepEqual(loadLevels('keepy', 3), [0, 0, 0]);
    saveLevels('keepy', [3, 1, 0]);
    saveLevels('treats', [2]);
    assert.deepEqual(loadLevels('keepy', 3), [3, 1, 0]);
    assert.deepEqual(loadLevels('treats', 2), [2, 0]);
    store.set('mia-bluey-v1', '{"keepy":[9,"x",-2]}');
    assert.deepEqual(loadLevels('keepy', 3), [3, 0, 0]);
    store.set('mia-bluey-v1', 'not json');
    assert.deepEqual(loadLevels('keepy', 2), [0, 0]);
  } finally {
    delete globalThis.localStorage;
  }
});

test('the lobby lists the Bluey games first and every section in order', () => {
  assert.deepEqual(
    games.slice(0, 2).map((g) => g.id),
    [...blueyGames],
  );
  const firsts = lobbySections.map((s) =>
    games.findIndex((g) => g.id === s.first),
  );
  assert.ok(firsts.every((i) => i >= 0));
  assert.deepEqual(
    firsts,
    [...firsts].sort((a, b) => a - b),
  );
  assert.equal(firsts[0], 0);
});

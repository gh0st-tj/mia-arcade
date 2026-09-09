import test from 'node:test';
import assert from 'node:assert/strict';
import {
  makeTrail,
  neighbors,
  makeMarket,
  makeRobot,
  robotColors,
} from '../lib/adventure-engine.ts';
import { games } from '../lib/game-data.ts';
function reachable(map, start, target) {
  const seen = new Set([start]),
    queue = [start];
  while (queue.length) {
    const cell = queue.shift();
    if (cell === target) return true;
    for (const n of neighbors(cell, map.size))
      if (!seen.has(n) && !map.rocks.includes(n)) {
        seen.add(n);
        queue.push(n);
      }
  }
  return false;
}
test('every treasure map allows Johnny to collect his bone and reach home', () => {
  for (const random of [Math.random, () => 0, () => 0.999])
    for (const level of [0, 1, 2])
      for (let i = 0; i < 150; i++) {
        const map = makeTrail(level, i % 3, random);
        assert.ok(map.size >= 4 && map.size <= 5);
        assert.equal(map.treats.length, 1);
        assert.ok(
          !map.rocks.includes(map.start) && !map.rocks.includes(map.goal),
        );
        for (const bone of map.treats) {
          assert.ok(reachable(map, map.start, bone));
          assert.ok(reachable(map, bone, map.goal));
        }
        for (let cell = 0; cell < map.size * map.size; cell++)
          for (const n of neighbors(cell, map.size))
            assert.equal(
              Math.abs(Math.floor(cell / map.size) - Math.floor(n / map.size)) +
                Math.abs((cell % map.size) - (n % map.size)),
              1,
            );
      }
});
test('picnic lists stay small and leave at least one food off the list', () => {
  for (const level of [0, 1, 2])
    for (let i = 0; i < 200; i++) {
      const list = makeMarket(level, i % 3);
      assert.equal(list.length, 4);
      assert.equal(list.filter(Boolean).length, level === 0 ? 2 : 3);
      assert.ok(
        list.every(
          (n) => Number.isInteger(n) && n >= 0 && n <= (level === 2 ? 3 : 2),
        ),
      );
      if (level === 0 && i % 3 === 0)
        assert.equal(
          list.reduce((a, b) => a + b, 0),
          2,
        );
    }
});
test('robot blueprints always use a small available palette across five parts', () => {
  for (const random of [Math.random, () => 0, () => 0.999])
    for (const level of [0, 1, 2])
      for (let i = 0; i < 100; i++) {
        const model = makeRobot(level, random);
        assert.equal(model.length, 5);
        assert.equal(new Set(model).size, level === 0 ? 3 : 4);
        assert.ok(model.every((c) => robotColors[c]));
      }
});
test('each game has an age guide and a non-decreasing difficulty for every level', () => {
  assert.equal(games.length, 12);
  assert.equal(new Set(games.map((g) => g.id)).size, 12);
  for (const g of games) {
    assert.equal(g.difficulty.length, 3);
    assert.ok(g.ages.en && g.ages.he);
    g.difficulty.forEach((d, i) => {
      assert.ok([1, 2, 3].includes(d));
      if (i) assert.ok(d >= g.difficulty[i - 1]);
    });
  }
  for (const id of ['trail', 'market', 'robot']) {
    const g = games.find((g) => g.id === id);
    assert.equal(g.ages.en, 'Ages 5–6');
    assert.deepEqual(g.difficulty, [2, 2, 2]);
  }
});

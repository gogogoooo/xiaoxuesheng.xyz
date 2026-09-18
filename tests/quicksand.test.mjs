import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context = vm.createContext({});
vm.runInContext(
  fs.readFileSync(
    new URL('../public/games/quicksand-simulator/physics.js', import.meta.url),
    'utf8',
  ),
  context,
);
const P = context.QuicksandPhysics;
function pool(material) {
  const w = P.createWorld(() => 0.5);
  w.cells.fill(material);
  w.player.x = 14;
  w.player.z = 14;
  return w;
}
function simulate(world, seconds, move = { x: 0, z: 0 }) {
  for (let i = 0; i < Math.round(seconds * 60); i++)
    P.step(world, 1 / 60, move);
}
test('brush respects spawn island, material boundaries and erasing', () => {
  const w = P.createWorld();
  P.paint(w, 3.5, 3.5, 4, 'sand');
  assert.equal(P.materialAt(w, 3, 3), null);
  P.paint(w, 10, 10, 2, 'chocolate');
  assert.equal(P.materialAt(w, 10, 10), 'chocolate');
  assert.equal(P.materialAt(w, 15, 15), null);
  P.paint(w, 10, 10, 2, null);
  assert.equal(P.materialAt(w, 10, 10), null);
  assert.equal(P.materialAt(w, -1, 2), null);
});
test('material buoyancy produces ordered sinking rates', () => {
  const worlds = ['sand', 'chocolate', 'ketchup'].map(pool);
  worlds.forEach((w) => simulate(w, 1));
  assert.ok(worlds[0].player.depth > 0);
  assert.ok(worlds[0].player.depth < worlds[1].player.depth);
  assert.ok(worlds[1].player.depth < worlds[2].player.depth);
});
test('struggling slows sinking but does not stop it', () => {
  const idle = pool('sand'),
    moving = pool('sand');
  simulate(idle, 1);
  simulate(moving, 1, { x: 1, z: 0 });
  assert.ok(moving.player.depth > 0);
  assert.ok(moving.player.depth < idle.player.depth);
  assert.ok(moving.player.x > idle.player.x);
});
test('full submersion hides the player then respawns on safe ground', () => {
  const w = P.createWorld();
  P.paint(w, 14, 14, 3, 'ketchup');
  w.player.x = 14;
  w.player.z = 14;
  simulate(w, 4);
  assert.equal(w.player.respawns, 1);
  assert.ok(w.player.hidden > 0);
  simulate(w, 1);
  assert.equal(w.player.x, 3.5);
  assert.equal(w.player.z, 3.5);
  assert.equal(w.player.depth, 0);
  assert.equal(w.player.hidden, 0);
});
test('leaving the pool recovers character height', () => {
  const w = P.createWorld();
  w.player.x = 14;
  w.player.z = 14;
  w.player.depth = 1;
  simulate(w, 1);
  assert.equal(w.player.depth, 0);
});
test('clones respect limits, wander and stay on board', () => {
  const w = P.createWorld(() => 0.2);
  assert.equal(P.spawnClone(w, -2, 4), null);
  for (let i = 0; i < 30; i++) P.spawnClone(w, 10, 10);
  assert.equal(w.clones.length, 24);
  simulate(w, 40);
  assert.ok(w.clones.some((a) => a.x !== 10));
  assert.ok(
    w.clones.every(
      (a) =>
        a.x >= 0.35 &&
        a.x <= P.SIZE - 0.35 &&
        a.z >= 0.35 &&
        a.z <= P.SIZE - 0.35,
    ),
  );
});
test('reset clears sandbox and recovers player and counters', () => {
  const w = pool('sand');
  P.spawnClone(w, 10, 10);
  w.player.respawns = 4;
  P.reset(w);
  assert.equal(w.cells.filter(Boolean).length, 0);
  assert.equal(w.clones.length, 0);
  assert.equal(w.player.depth, 0);
  assert.equal(w.player.respawns, 0);
  assert.equal(w.player.x, 3.5);
});
test('diagonal movement is normalized and long frames are bounded', () => {
  const a = P.createWorld(),
    b = P.createWorld();
  simulate(a, 1, { x: 1, z: 0 });
  simulate(b, 1, { x: 1, z: 1 });
  assert.ok(
    Math.abs(
      Math.hypot(a.player.x - 3.5, a.player.z - 3.5) -
        Math.hypot(b.player.x - 3.5, b.player.z - 3.5),
    ) < 1e-8,
  );
  const w = pool('sand');
  P.step(w, 10);
  assert.ok(w.player.depth < 0.1);
});

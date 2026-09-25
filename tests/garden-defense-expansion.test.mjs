import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const gameDir = new URL('../public/games/garden-defense/', import.meta.url);
const context = vm.createContext({});
vm.runInContext(fs.readFileSync(new URL('rules.js', gameDir), 'utf8'), context);
const R = context.GardenRules;
const game = () => R.createGame(() => 0.5);
function advance(g, seconds) {
  for (let i = 0; i < seconds * 20; i++) R.tick(g, 0.05);
}

test('setting choices validate values and update uncollected sunlight immediately', () => {
  const g = game();
  assert.equal(g.settings.sunValue, 25);
  assert.equal(g.settings.volley, 1);
  assert.equal(g.settings.specialInterval, 1.5);
  const existing = R.dropSun(g, 3, 1);
  assert.equal(R.setSetting(g, 'sunValue', 100), true);
  assert.equal(existing.value, 100);
  assert.equal(R.dropSun(g, 4, 1).value, 100);
  assert.equal(R.setSetting(g, 'sunValue', 123), false);
  assert.equal(R.setSetting(g, 'unknown', 1), false);
  assert.equal(R.collectSun(g, existing.id), true);
  assert.equal(g.sun, 250);
  const restarted = R.createGame(() => 0.5, g.settings);
  assert.equal(restarted.settings.sunValue, 100);
  assert.equal(restarted.sun, 150);
});

test('pea shooter fires the selected number of separate shots on later volleys', () => {
  const g = game();
  g.sun = 1000;
  g.spawnTimer = 1000;
  g.skyTimer = 1000;
  R.plant(g, 2, 1, 'shooter');
  R.spawnZombie(g, 2, 'basic', 9.5);
  assert.equal(R.setSetting(g, 'volley', 4), true);
  advance(g, 0.4);
  assert.equal(g.shots.length, 4);
  assert.equal(new Set(g.shots.map((s) => s.x)).size, 4);
  assert.ok(g.shots.every((s) => s.damage === 24));
  assert.equal(R.setSetting(g, 'volley', 16), true);
  advance(g, 1.25);
  assert.equal(g.shots.length, 20);
  assert.equal(R.createGame(() => 0.5, g.settings).settings.volley, 16);
});

test('three new plants use their own costs and cooldowns', () => {
  const g = game();
  g.sun = 1000;
  assert.equal(R.plant(g, 1, 2, 'ice'), true);
  assert.equal(R.plant(g, 2, 2, 'spike'), true);
  assert.equal(R.plant(g, 3, 4, 'twin'), true);
  assert.equal(g.sun, 625);
  assert.equal(g.cooldowns.ice, 7);
  assert.equal(g.cooldowns.spike, 8);
  assert.equal(g.cooldowns.twin, 9);
  assert.equal(R.plant(g, 1, 3, 'ice'), false);
});

test('ice shot damages and slows a zombie without stacking speed penalties', () => {
  const g = game();
  g.sun = 1000;
  g.spawnTimer = 1000;
  g.skyTimer = 1000;
  R.plant(g, 2, 1, 'ice');
  const zombie = R.spawnZombie(g, 2, 'basic', 2.5);
  advance(g, 0.5);
  assert.equal(zombie.hp, 164);
  assert.ok(zombie.slow > 2);
  g.plants.length = 0;
  g.shots.length = 0;
  const before = zombie.x;
  advance(g, 1);
  assert.ok(before - zombie.x > 0.085 && before - zombie.x < 0.105);
  advance(g, 3);
  assert.equal(zombie.slow, 0);
});

test('spike damages only zombies in its own cell and row', () => {
  const g = game();
  g.sun = 1000;
  g.spawnTimer = 1000;
  g.skyTimer = 1000;
  R.plant(g, 1, 2, 'spike');
  const inside = R.spawnZombie(g, 1, 'basic', 2.5);
  const otherRow = R.spawnZombie(g, 2, 'basic', 2.5);
  const otherCell = R.spawnZombie(g, 1, 'basic', 4.5);
  advance(g, 1);
  assert.ok(inside.hp <= 135);
  assert.equal(otherRow.hp, 180);
  assert.equal(otherCell.hp, 180);
});

test('twin shooter fires left and right; shared interval speeds up ice and twin', () => {
  const g = game();
  g.sun = 1000;
  g.spawnTimer = 1000;
  g.skyTimer = 1000;
  R.plant(g, 1, 1, 'ice');
  R.plant(g, 2, 4, 'twin');
  R.spawnZombie(g, 1, 'basic', 9.5);
  R.spawnZombie(g, 2, 'basic', 0.5);
  R.spawnZombie(g, 2, 'basic', 9.5);
  advance(g, 0.4);
  assert.ok(g.shots.some((s) => s.row === 2 && s.direction === -1));
  assert.ok(g.shots.some((s) => s.row === 2 && s.direction === 1));
  const before = g.shots.length;
  assert.equal(R.setSetting(g, 'specialInterval', 0.25), true);
  advance(g, 0.3);
  assert.ok(g.shots.length > before);
  assert.ok(g.shots.filter((s) => s.row === 1).length >= 2);
  assert.ok(g.shots.filter((s) => s.row === 2).length >= 4);
  assert.equal(R.createGame(() => 0.5, g.settings).settings.specialInterval, 0.25);
});

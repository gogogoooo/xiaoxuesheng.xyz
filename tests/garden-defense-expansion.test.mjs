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

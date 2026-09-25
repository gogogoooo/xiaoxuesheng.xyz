import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const gameDir = new URL('../public/games/garden-defense/', import.meta.url);
const context = vm.createContext({});
if (fs.existsSync(new URL('rules.js', gameDir))) {
  vm.runInContext(
    fs.readFileSync(new URL('rules.js', gameDir), 'utf8'),
    context,
  );
}
const R = context.GardenRules;
function game() {
  return R.createGame(() => 0.5);
}
function advance(g, seconds) {
  for (let i = 0; i < seconds * 20; i++) R.tick(g, 0.05);
}

test('plants cost sun, respect grid occupancy and individual cooldown', () => {
  const g = game();
  assert.equal(g.sun, 150);
  assert.equal(R.plant(g, 1, 2, 'sunflower'), true);
  assert.equal(g.sun, 100);
  assert.equal(R.plant(g, 1, 2, 'shooter'), false);
  assert.equal(R.plant(g, -1, 2, 'shooter'), false);
  assert.equal(R.plant(g, 2, 2, 'shooter'), true);
  assert.equal(g.sun, 0);
  assert.equal(R.plant(g, 3, 3, 'sunflower'), false);
  advance(g, 8);
  assert.ok(g.sunDrops.length > 0);
  const drop = g.sunDrops[0];
  assert.equal(R.collectSun(g, drop.id), true);
  assert.equal(g.sun, 25);
  assert.equal(R.collectSun(g, drop.id), false);
});

test('shooter fires in its lane and zombies bite nearby plants', () => {
  const g = game();
  R.plant(g, 2, 1, 'shooter');
  const target = R.spawnZombie(g, 2, 'basic', 5.5);
  const other = R.spawnZombie(g, 3, 'basic', 5.5);
  advance(g, 5);
  assert.ok(target.hp < R.ZOMBIES.basic.hp);
  assert.equal(other.hp, R.ZOMBIES.basic.hp);
  const bite = R.spawnZombie(g, 2, 'basic', 1.6);
  const hp = g.plants[0].hp;
  advance(g, 2);
  assert.ok(g.plants[0].hp < hp);
  assert.ok(bite.x > 1.3);
});

test('wall blocks longer and bomb damages multiple nearby enemies once', () => {
  const g = game();
  g.sun = 1000;
  assert.equal(R.plant(g, 0, 2, 'wall'), true);
  assert.ok(g.plants[0].hp > R.PLANTS.shooter.hp);
  R.spawnZombie(g, 1, 'basic', 4.1);
  R.spawnZombie(g, 1, 'cone', 4.3);
  assert.equal(R.plant(g, 1, 3, 'bomb'), true);
  advance(g, 1);
  assert.equal(
    g.plants.some((p) => p.type === 'bomb'),
    false,
  );
  assert.ok(g.zombies.every((z) => z.row !== 1 || z.hp < R.ZOMBIES[z.type].hp));
});

test('shovel removes only an occupied cell', () => {
  const g = game();
  assert.equal(R.shovel(g, 1, 1), false);
  R.plant(g, 1, 1, 'wall');
  assert.equal(R.shovel(g, 1, 1), true);
  assert.equal(g.plants.length, 0);
});

test('lawn mower saves its lane once, then a second breach loses', () => {
  const g = game();
  g.spawnTimer = 1000;
  R.spawnZombie(g, 2, 'basic', -0.02);
  advance(g, 0.1);
  assert.equal(g.mowers[2].used, true);
  advance(g, 2);
  assert.equal(g.zombies.filter((z) => z.row === 2).length, 0);
  R.spawnZombie(g, 2, 'basic', -0.02);
  advance(g, 0.1);
  assert.equal(g.status, 'lost');
});

test('three waves and clear lawn produce victory; paused state does not advance', () => {
  const g = game();
  g.status = 'paused';
  const before = g.time;
  advance(g, 2);
  assert.equal(g.time, before);
  g.status = 'playing';
  g.wave = 3;
  g.spawnsLeft = 0;
  g.zombies.length = 0;
  g.nextWaveAt = null;
  advance(g, 0.1);
  assert.equal(g.status, 'won');
});

test('offline HTML uses local assets and site page exposes game link', () => {
  assert.ok(fs.existsSync(new URL('index.html', gameDir)));
  const html = fs.readFileSync(new URL('index.html', gameDir), 'utf8');
  for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    assert.ok(!/^https?:|^\/\//.test(match[1]));
    if (!match[1].endsWith('/apps.html'))
      assert.ok(fs.existsSync(new URL(match[1], gameDir)), match[1]);
  }
  assert.match(html, /id="board"/);
  assert.match(html, /data-plant="shooter"/);
  assert.match(html, /id="shovel"/);
  assert.match(html, /id="pause"/);
  assert.match(html, /id="restart"/);
  const apps = fs.readFileSync(
    new URL('../app/apps/page.tsx', import.meta.url),
    'utf8',
  );
  assert.match(apps, /\/games\/garden-defense\//);
});

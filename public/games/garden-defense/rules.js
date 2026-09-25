/* Offline game rules. All positions use board columns, independent of Canvas pixels. */
(function (root) {
  'use strict';
  const ROWS = 5,
    COLS = 9;
  const PLANTS = {
    shooter: {
      name: '豆豆射手',
      cost: 100,
      hp: 140,
      cooldown: 5,
      interval: 1.25,
    },
    sunflower: { name: '向日花', cost: 50, hp: 115, cooldown: 5, interval: 7 },
    wall: { name: '坚果盾', cost: 75, hp: 640, cooldown: 14 },
    bomb: { name: '爆爆果', cost: 150, hp: 150, cooldown: 18, delay: 0.8 },
    ice: { name: '冰冻射手', cost: 125, hp: 140, cooldown: 7 },
    spike: { name: '地刺', cost: 75, hp: 180, cooldown: 8 },
    twin: { name: '双向射手', cost: 175, hp: 140, cooldown: 9 },
  };
  const ZOMBIES = {
    basic: { hp: 180, speed: 0.19, damage: 31 },
    cone: { hp: 370, speed: 0.16, damage: 31 },
  };
  const SETTING_OPTIONS = {
    sunValue: [25, 50, 100, 200, 500],
    volley: [1, 2, 4, 8, 16],
    specialInterval: [0.25, 0.5, 1, 1.5, 2],
  };
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  function createGame(random = Math.random, savedSettings = {}) {
    const settings = {
      sunValue: SETTING_OPTIONS.sunValue.includes(savedSettings.sunValue)
        ? savedSettings.sunValue
        : 25,
      volley: SETTING_OPTIONS.volley.includes(savedSettings.volley)
        ? savedSettings.volley
        : 1,
      specialInterval: SETTING_OPTIONS.specialInterval.includes(
        savedSettings.specialInterval,
      )
        ? savedSettings.specialInterval
        : 1.5,
    };
    return {
      status: 'playing',
      time: 0,
      random,
      settings,
      sun: 150,
      wave: 1,
      plants: [],
      zombies: [],
      shots: [],
      sunDrops: [],
      effects: [],
      mowers: Array.from({ length: ROWS }, (_, row) => ({
        row,
        x: -0.35,
        used: false,
        active: false,
      })),
      cooldowns: Object.fromEntries(
        Object.keys(PLANTS).map((type) => [type, 0]),
      ),
      spawnsLeft: 5,
      spawnTimer: 5,
      skyTimer: 8,
      nextWaveAt: null,
      nextId: 1,
    };
  }
  function plant(g, row, col, type) {
    const config = PLANTS[type];
    if (
      g.status !== 'playing' ||
      !config ||
      !Number.isInteger(row) ||
      !Number.isInteger(col) ||
      row < 0 ||
      row >= ROWS ||
      col < 0 ||
      col >= COLS ||
      g.sun < config.cost ||
      g.cooldowns[type] > 0.001 ||
      g.plants.some((p) => p.row === row && p.col === col)
    )
      return false;
    g.sun -= config.cost;
    g.cooldowns[type] = config.cooldown;
    g.plants.push({
      id: g.nextId++,
      row,
      col,
      type,
      hp: config.hp,
      timer: type === 'sunflower' ? 6.5 : type === 'bomb' ? config.delay : 0.35,
    });
    return true;
  }
  function shovel(g, row, col) {
    if (g.status !== 'playing') return false;
    const index = g.plants.findIndex((p) => p.row === row && p.col === col);
    if (index < 0) return false;
    g.plants.splice(index, 1);
    return true;
  }
  function spawnZombie(g, row, type = 'basic', x = COLS + 0.65) {
    if (!Number.isInteger(row) || row < 0 || row >= ROWS || !ZOMBIES[type])
      return null;
    const z = {
      id: g.nextId++,
      row,
      x,
      type,
      hp: ZOMBIES[type].hp,
      bite: 0,
      slow: 0,
    };
    g.zombies.push(z);
    return z;
  }
  function setSetting(g, key, value) {
    if (!SETTING_OPTIONS[key]?.includes(value)) return false;
    g.settings[key] = value;
    if (key === 'sunValue') for (const drop of g.sunDrops) drop.value = value;
    if (key === 'specialInterval')
      for (const plant of g.plants)
        if (plant.type === 'ice' || plant.type === 'twin') plant.timer = value;
    return true;
  }
  function dropSun(g, x, row, value = g.settings.sunValue) {
    const drop = { id: g.nextId++, x, row, value, ttl: 12, age: 0 };
    g.sunDrops.push(drop);
    return drop;
  }
  function collectSun(g, id) {
    if (g.status !== 'playing') return false;
    const index = g.sunDrops.findIndex((drop) => drop.id === id);
    if (index < 0) return false;
    g.sun += g.sunDrops[index].value;
    g.sunDrops.splice(index, 1);
    return true;
  }
  function startNextWave(g) {
    g.wave++;
    g.spawnsLeft = g.wave === 2 ? 7 : 10;
    g.spawnTimer = 2;
    g.nextWaveAt = null;
    g.sun += 35;
  }
  function tick(g, rawDt) {
    if (g.status !== 'playing') return;
    const dt = clamp(Number(rawDt) || 0, 0, 0.05);
    if (!dt) return;
    g.time += dt;
    for (const key of Object.keys(g.cooldowns))
      g.cooldowns[key] = Math.max(0, g.cooldowns[key] - dt);
    g.skyTimer -= dt;
    if (g.skyTimer <= 0) {
      dropSun(g, 1 + g.random() * 7, Math.floor(g.random() * ROWS));
      g.skyTimer += 10;
    }
    for (let i = g.sunDrops.length - 1; i >= 0; i--) {
      const d = g.sunDrops[i];
      d.age += dt;
      d.ttl -= dt;
      if (d.ttl <= 0) g.sunDrops.splice(i, 1);
    }
    for (let i = g.effects.length - 1; i >= 0; i--) {
      g.effects[i].ttl -= dt;
      if (g.effects[i].ttl <= 0) g.effects.splice(i, 1);
    }
    for (const p of g.plants) {
      p.timer -= dt;
      if (p.type === 'sunflower' && p.timer <= 0) {
        dropSun(g, p.col + 0.5, p.row);
        p.timer += PLANTS.sunflower.interval;
      }
      if (p.type === 'shooter' && p.timer <= 0) {
        if (
          g.zombies.some(
            (z) => z.row === p.row && z.x > p.col + 0.5 && z.hp > 0,
          )
        ) {
          for (let i = 0; i < g.settings.volley; i++)
            g.shots.push({
              id: g.nextId++,
              row: p.row,
              x: p.col + 0.88 - i * 0.035,
              damage: 24,
            });
          p.timer += PLANTS.shooter.interval;
        } else p.timer = 0.18;
      }
      if ((p.type === 'ice' || p.type === 'twin') && p.timer <= 0) {
        const center = p.col + 0.5;
        const right = g.zombies.some(
          (z) => z.row === p.row && z.x > center && z.hp > 0,
        );
        const left =
          p.type === 'twin' &&
          g.zombies.some((z) => z.row === p.row && z.x < center && z.hp > 0);
        if (right)
          g.shots.push({
            id: g.nextId++,
            row: p.row,
            x: p.col + 0.88,
            direction: 1,
            damage: p.type === 'ice' ? 16 : 24,
            slow: p.type === 'ice' ? 3 : 0,
          });
        if (left)
          g.shots.push({
            id: g.nextId++,
            row: p.row,
            x: p.col + 0.12,
            direction: -1,
            damage: 24,
          });
        p.timer = right || left ? g.settings.specialInterval : 0.18;
      }
      if (p.type === 'spike')
        for (const z of g.zombies)
          if (
            z.hp > 0 &&
            z.row === p.row &&
            Math.abs(z.x - (p.col + 0.5)) < 0.5
          )
            z.hp -= 45 * dt;
      if (p.type === 'bomb' && p.timer <= 0) {
        for (const z of g.zombies)
          if (
            Math.abs(z.row - p.row) <= 1 &&
            Math.abs(z.x - (p.col + 0.5)) <= 1.5
          )
            z.hp -= 400;
        g.effects.push({
          type: 'burst',
          row: p.row,
          x: p.col + 0.5,
          ttl: 0.65,
        });
        p.hp = 0;
      }
    }
    g.plants = g.plants.filter((p) => p.hp > 0);
    for (const shot of g.shots) {
      const oldX = shot.x;
      const direction = shot.direction ?? 1;
      shot.x += direction * 4.6 * dt;
      const target = g.zombies
        .filter(
          (z) =>
            z.row === shot.row &&
            z.hp > 0 &&
            z.x >= Math.min(oldX, shot.x) - 0.2 &&
            z.x <= Math.max(oldX, shot.x) + 0.28,
        )
        .sort((a, b) => direction * (a.x - b.x))[0];
      if (target) {
        target.hp -= shot.damage;
        if (shot.slow) target.slow = Math.max(target.slow, shot.slow);
        shot.hit = true;
        g.effects.push({ type: 'hit', row: shot.row, x: target.x, ttl: 0.18 });
      }
    }
    g.shots = g.shots.filter((s) => !s.hit && s.x > -1 && s.x < COLS + 1);
    for (const z of g.zombies) {
      if (z.hp <= 0) continue;
      z.slow = Math.max(0, z.slow - dt);
      const target = g.plants.find(
        (p) => p.row === z.row && Math.abs(z.x - (p.col + 0.5)) < 0.42,
      );
      if (target) {
        z.bite -= dt;
        if (z.bite <= 0) {
          target.hp -= ZOMBIES[z.type].damage;
          z.bite = 0.72;
        }
      } else {
        z.x -= ZOMBIES[z.type].speed * (z.slow > 0 ? 0.5 : 1) * dt;
        z.bite = 0;
      }
      if (z.x < 0 && z.hp > 0) {
        const mower = g.mowers[z.row];
        if (!mower.used) {
          mower.used = true;
          mower.active = true;
          mower.x = -0.2;
        } else if (!mower.active) {
          g.status = 'lost';
          return;
        }
      }
    }
    g.plants = g.plants.filter((p) => p.hp > 0);
    for (const mower of g.mowers)
      if (mower.active) {
        mower.x += 7.5 * dt;
        for (const z of g.zombies)
          if (z.row === mower.row && z.x <= mower.x + 0.65) z.hp = 0;
        if (mower.x > COLS + 1) mower.active = false;
      }
    g.zombies = g.zombies.filter((z) => z.hp > 0);
    if (g.spawnsLeft > 0) {
      g.spawnTimer -= dt;
      if (g.spawnTimer <= 0) {
        const row = Math.floor(g.random() * ROWS);
        const type =
          g.wave > 1 && g.random() < (g.wave === 2 ? 0.22 : 0.4)
            ? 'cone'
            : 'basic';
        spawnZombie(g, row, type);
        g.spawnsLeft--;
        g.spawnTimer = g.wave === 1 ? 5.2 : g.wave === 2 ? 3.9 : 3.2;
      }
    }
    if (
      g.spawnsLeft === 0 &&
      g.zombies.length === 0 &&
      g.mowers.every((m) => !m.active)
    ) {
      if (g.wave === 3) g.status = 'won';
      else if (g.nextWaveAt === null) g.nextWaveAt = g.time + 4;
    }
    if (g.nextWaveAt !== null && g.time >= g.nextWaveAt) startNextWave(g);
  }
  root.GardenRules = {
    ROWS,
    COLS,
    PLANTS,
    ZOMBIES,
    SETTING_OPTIONS,
    createGame,
    setSetting,
    plant,
    shovel,
    spawnZombie,
    collectSun,
    dropSun,
    tick,
  };
})(globalThis);

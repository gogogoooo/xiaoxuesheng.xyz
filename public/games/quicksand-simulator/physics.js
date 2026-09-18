/* Independent deterministic simulation. Classic script so file:// works without a server. */
(function (root) {
  'use strict';
  const SIZE = 28;
  const HEIGHT = 1.85;
  const MAX_CLONES = 24;
  const MATERIALS = {
    sand: {
      name: '黄沙',
      color: '#d6ae5f',
      dark: '#ad813a',
      light: '#eed598',
      buoyancy: 0.68,
      viscosity: 0.44,
    },
    chocolate: {
      name: '巧克力',
      color: '#79523c',
      dark: '#543624',
      light: '#bd8862',
      buoyancy: 0.42,
      viscosity: 0.27,
    },
    ketchup: {
      name: '番茄酱',
      color: '#cc5941',
      dark: '#9d3c2c',
      light: '#f39972',
      buoyancy: 0.15,
      viscosity: 0.6,
    },
  };
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const safe = (x, z) => x >= 1 && x < 6 && z >= 1 && z < 6;
  function actor(id, player) {
    return {
      id,
      player,
      x: 3.5,
      z: 3.5,
      depth: 0,
      heading: 0,
      phase: 0,
      moving: false,
      material: null,
      respawns: 0,
      hidden: 0,
      turn: 0,
      dx: 1,
      dz: 0,
    };
  }
  function createWorld(random = Math.random) {
    return {
      cells: Array(SIZE * SIZE).fill(null),
      player: actor(0, true),
      clones: [],
      random,
      nextId: 1,
    };
  }
  function materialAt(world, x, z) {
    if (x < 0 || z < 0 || x >= SIZE || z >= SIZE) return null;
    return world.cells[Math.floor(z) * SIZE + Math.floor(x)];
  }
  function paint(world, x, z, radius, material) {
    if (material !== null && !MATERIALS[material]) return 0;
    let changed = 0;
    for (
      let iz = Math.max(0, Math.floor(z - radius));
      iz <= Math.min(SIZE - 1, Math.ceil(z + radius));
      iz++
    ) {
      for (
        let ix = Math.max(0, Math.floor(x - radius));
        ix <= Math.min(SIZE - 1, Math.ceil(x + radius));
        ix++
      ) {
        if (safe(ix, iz) || Math.hypot(ix + 0.5 - x, iz + 0.5 - z) > radius)
          continue;
        const index = iz * SIZE + ix;
        if (world.cells[index] !== material) {
          world.cells[index] = material;
          changed++;
        }
      }
    }
    return changed;
  }
  function spawnClone(world, x, z) {
    if (
      world.clones.length >= MAX_CLONES ||
      x < 0 ||
      z < 0 ||
      x >= SIZE ||
      z >= SIZE
    )
      return null;
    const clone = actor(world.nextId++, false);
    clone.x = clamp(x, 0.5, SIZE - 0.5);
    clone.z = clamp(z, 0.5, SIZE - 0.5);
    clone.turn = 0;
    world.clones.push(clone);
    return clone;
  }
  function reset(world) {
    world.cells.fill(null);
    world.clones.length = 0;
    world.player = actor(0, true);
    world.nextId = 1;
  }
  function updateActor(world, a, dt, dx, dz) {
    if (a.hidden > 0) {
      a.hidden = Math.max(0, a.hidden - dt);
      if (a.hidden === 0) {
        a.x = 3.5;
        a.z = 3.5;
        a.depth = 0;
        a.material = null;
      }
      return;
    }
    const len = Math.hypot(dx, dz);
    const trying = len > 0.001;
    const before = MATERIALS[materialAt(world, a.x, a.z)];
    const speed =
      (a.player ? 3.7 : 1.7) *
      (before
        ? before.viscosity * Math.max(0.12, 1 - (a.depth / HEIGHT) * 0.85)
        : 1);
    const px = a.x,
      pz = a.z;
    if (trying) {
      a.x = clamp(a.x + (dx / len) * speed * dt, 0.35, SIZE - 0.35);
      a.z = clamp(a.z + (dz / len) * speed * dt, 0.35, SIZE - 0.35);
      a.heading = Math.atan2(dx, dz);
    }
    a.moving = Math.hypot(a.x - px, a.z - pz) > 0.0001;
    if (a.moving) a.phase += dt * (before ? 5 : 10);
    a.material = materialAt(world, a.x, a.z);
    const m = MATERIALS[a.material];
    if (m)
      a.depth += (0.2 + (1 - m.buoyancy) * 0.35) * (trying ? 0.68 : 1) * dt;
    else a.depth = Math.max(0, a.depth - dt * 2.3);
    if (a.depth >= HEIGHT) {
      a.depth = HEIGHT;
      a.hidden = 0.7;
      a.respawns++;
      a.moving = false;
    }
  }
  function step(world, dt, move = { x: 0, z: 0 }) {
    dt = clamp(dt, 0, 0.05);
    updateActor(world, world.player, dt, move.x, move.z);
    for (const a of world.clones) {
      a.turn -= dt;
      if (a.turn <= 0) {
        const angle = world.random() * Math.PI * 2;
        a.dx = Math.cos(angle);
        a.dz = Math.sin(angle);
        a.turn = 1.5 + world.random() * 3;
      }
      if ((a.x < 0.6 && a.dx < 0) || (a.x > SIZE - 0.6 && a.dx > 0)) a.dx *= -1;
      if ((a.z < 0.6 && a.dz < 0) || (a.z > SIZE - 0.6 && a.dz > 0)) a.dz *= -1;
      updateActor(world, a, dt, a.dx, a.dz);
    }
  }
  root.QuicksandPhysics = {
    SIZE,
    HEIGHT,
    MAX_CLONES,
    MATERIALS,
    clamp,
    safe,
    createWorld,
    materialAt,
    paint,
    spawnClone,
    reset,
    step,
  };
})(globalThis);

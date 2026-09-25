(function () {
  'use strict';
  const P = window.QuicksandPhysics;
  const $ = (id) => document.getElementById(id);
  const canvas = $('world'),
    ctx = canvas.getContext('2d');
  if (!ctx) {
    $('player-state').textContent = '浏览器不支持 Canvas，请换用现代浏览器';
    return;
  }
  const world = P.createWorld();
  const camera = { angle: -0.68, tilt: 0.6, zoom: 1 };
  let width = 900,
    height = 730,
    scale = 20;
  let selected = 'sand',
    tool = 'paint',
    brush = 3,
    paused = false;
  let pointer = null,
    drag = null,
    lastPaint = null,
    uiTimer = 0,
    toastTimer = 0;
  let lastTime = 0,
    clock = 0,
    lastRespawns = 0;
  const keys = new Set(),
    particles = [],
    ripples = [];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let terrainCache = document.createElement('canvas'),
    terrainDirty = true;
  const colors = ['#e3a953', '#74a6af', '#b69cbe', '#cf8869', '#779969'];
  function projection(x, z, y = 0) {
    const dx = x - P.SIZE / 2,
      dz = z - P.SIZE / 2,
      c = Math.cos(camera.angle),
      s = Math.sin(camera.angle);
    return {
      x: width / 2 + (dx * c - dz * s) * scale,
      y: height * 0.57 + (dx * s + dz * c) * scale * camera.tilt - y * scale,
    };
  }
  function unproject(x, y) {
    const rx = (x - width / 2) / scale,
      rz = (y - height * 0.57) / (scale * camera.tilt);
    const c = Math.cos(camera.angle),
      s = Math.sin(camera.angle);
    return {
      x: rx * c + rz * s + P.SIZE / 2,
      z: -rx * s + rz * c + P.SIZE / 2,
    };
  }
  function depth(x, z) {
    return x * Math.sin(camera.angle) + z * Math.cos(camera.angle);
  }
  function polygon(points, fill, stroke, target = ctx) {
    target.beginPath();
    points.forEach((p, i) =>
      i ? target.lineTo(p.x, p.y) : target.moveTo(p.x, p.y),
    );
    target.closePath();
    if (fill) {
      target.fillStyle = fill;
      target.fill();
    }
    if (stroke) {
      target.strokeStyle = stroke;
      target.lineWidth = 0.8;
      target.stroke();
    }
  }
  function tile(x, z, w, d, y, color, stroke, target = ctx) {
    polygon(
      [
        projection(x, z, y),
        projection(x + w, z, y),
        projection(x + w, z + d, y),
        projection(x, z + d, y),
      ],
      color,
      stroke,
      target,
    );
  }
  function tint(hex, amount) {
    const n = parseInt(hex.slice(1), 16);
    return `rgb(${P.clamp((n >> 16) + amount, 0, 255)},${P.clamp(((n >> 8) & 255) + amount, 0, 255)},${P.clamp((n & 255) + amount, 0, 255)})`;
  }
  function box(x, z, y, w, d, h, color, target = ctx, clip = false) {
    if (clip && y + h <= 0.015) return;
    const bottom = clip ? Math.max(0.015, y) : y,
      top = y + h;
    const a = projection(x, z, bottom),
      b = projection(x + w, z, bottom),
      c = projection(x + w, z + d, bottom),
      e = projection(x, z + d, bottom);
    const A = projection(x, z, top),
      B = projection(x + w, z, top),
      C = projection(x + w, z + d, top),
      E = projection(x, z + d, top);
    if (Math.sin(camera.angle) < 0)
      polygon([a, e, E, A], tint(color, -23), null, target);
    else polygon([b, c, C, B], tint(color, -23), null, target);
    if (Math.cos(camera.angle) > 0)
      polygon([e, c, C, E], tint(color, -9), null, target);
    else polygon([a, b, B, A], tint(color, -9), null, target);
    polygon([A, B, C, E], tint(color, 15), null, target);
  }
  function resize() {
    const r = canvas.getBoundingClientRect();
    width = r.width;
    height = r.height;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scale =
      Math.min(
        (width - 60) / (P.SIZE * 1.43),
        (height - 225) / (P.SIZE * 1.43 * 0.6),
      ) * camera.zoom;
    terrainCache.width = canvas.width;
    terrainCache.height = canvas.height;
    terrainDirty = true;
  }
  function renderTerrain() {
    const target = terrainCache.getContext('2d'),
      dpr = Math.min(devicePixelRatio || 1, 2);
    target.setTransform(dpr, 0, 0, dpr, 0, 0);
    target.clearRect(0, 0, width, height);
    target.save();
    target.shadowColor = '#62754e32';
    target.shadowBlur = 25;
    target.shadowOffsetY = 24;
    tile(
      -0.55,
      -0.55,
      P.SIZE + 1.1,
      P.SIZE + 1.1,
      -0.9,
      '#b4bda0',
      null,
      target,
    );
    target.restore();
    box(
      -0.55,
      -0.55,
      -1.0,
      P.SIZE + 1.1,
      P.SIZE + 1.1,
      0.85,
      '#aab792',
      target,
    );
    tile(-0.3, -0.3, P.SIZE + 0.6, P.SIZE + 0.6, 0.01, '#d3dcbe', null, target);
    for (let z = 0; z < P.SIZE; z++)
      for (let x = 0; x < P.SIZE; x++) {
        const material = world.cells[z * P.SIZE + x],
          m = P.MATERIALS[material];
        const noise = ((x * 73 + z * 37) % 17) - 8;
        const color = P.safe(x, z)
          ? (x + z) % 2
            ? '#9eb690'
            : '#a3ba94'
          : m
            ? tint(m.color, noise * 0.48)
            : (x + z) % 2
              ? '#dfd3b4'
              : '#e2d6b8';
        tile(x, z, 1.01, 1.01, 0, color, null, target);
        if (m && (x * 7 + z * 11) % 4 === 0) {
          const p = projection(x + 0.35, z + 0.53, 0.016);
          target.fillStyle = tint(m.color, 22);
          target.fillRect(p.x, p.y, Math.max(1.3, scale * 0.06), 1.3);
        }
      }
    for (let i = 0; i <= P.SIZE; i += 2) {
      const a = projection(i, 0),
        b = projection(i, P.SIZE),
        c = projection(0, i),
        d = projection(P.SIZE, i);
      target.beginPath();
      target.moveTo(a.x, a.y);
      target.lineTo(b.x, b.y);
      target.moveTo(c.x, c.y);
      target.lineTo(d.x, d.y);
      target.strokeStyle = '#655b3710';
      target.lineWidth = 0.6;
      target.stroke();
    }
    // A painted cross identifies the protected spawn island in every camera orientation.
    tile(3.25, 2.6, 0.5, 1.8, 0.02, '#f1f6db', null, target);
    tile(2.6, 3.25, 1.8, 0.5, 0.021, '#f1f6db', null, target);
    const front = projection(P.SIZE / 2, P.SIZE + 0.5, -0.9);
    target.font = '600 9px "Segoe UI",sans-serif';
    target.textAlign = 'center';
    target.fillStyle = '#70825c';
    target.fillText(
      'Q U I C K S A N D   /   F I E L D   0 1',
      front.x,
      front.y + 19,
    );
    terrainDirty = false;
  }
  function ring(x, z, r, color, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const t = (i / 40) * Math.PI * 2,
        p = projection(x + Math.cos(t) * r, z + Math.sin(t) * r, 0.025);
      i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();
  }
  function drawActor(a) {
    if (a.hidden > 0) return;
    const foot = projection(a.x, a.z, 0.02);
    ctx.save();
    ctx.fillStyle = '#39462c25';
    ctx.beginPath();
    ctx.ellipse(foot.x, foot.y, scale * 0.52, scale * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    const y = -a.depth,
      shirt = a.player ? '#f3b751' : colors[(a.id - 1) % colors.length];
    const stride = a.moving ? Math.sin(a.phase) * 0.13 : 0;
    const parts = [
      [a.x - 0.29, a.z - 0.17 + stride, y, 0.24, 0.34, 0.59, '#4c6565'],
      [a.x + 0.05, a.z - 0.17 - stride, y, 0.24, 0.34, 0.59, '#4c6565'],
      [a.x - 0.35, a.z - 0.22, y + 0.6, 0.7, 0.44, 0.68, shirt],
      [a.x - 0.54, a.z - 0.16 - stride, y + 0.66, 0.19, 0.32, 0.57, '#f1cc98'],
      [a.x + 0.35, a.z - 0.16 + stride, y + 0.66, 0.19, 0.32, 0.57, '#f1cc98'],
      [a.x - 0.29, a.z - 0.27, y + 1.3, 0.58, 0.54, 0.55, '#f3d6a7'],
    ];
    parts.sort(
      (a, b) =>
        depth(a[0] + a[3] / 2, a[1] + a[4] / 2) +
        a[2] * 0.12 -
        (depth(b[0] + b[3] / 2, b[1] + b[4] / 2) + b[2] * 0.12),
    );
    parts.forEach((p) => box(...p, ctx, true));
    // Two tiny eyes on the visible side keep the block characters friendly.
    if (y + 1.61 > 0.05) {
      const frontZ = Math.cos(camera.angle) > 0 ? a.z + 0.275 : a.z - 0.275;
      for (const dx of [-0.13, 0.13]) {
        const p = projection(a.x + dx, frontZ, y + 1.62);
        ctx.fillStyle = '#4c4b37';
        ctx.fillRect(
          p.x - 1,
          p.y - 1,
          Math.max(1.6, scale * 0.065),
          Math.max(1.8, scale * 0.08),
        );
      }
    }
    if (a.player) {
      const p = projection(a.x, a.z, Math.max(0.2, y + P.HEIGHT) + 0.6);
      ctx.fillStyle = '#355c45';
      ctx.beginPath();
      ctx.moveTo(p.x - 4, p.y - 4);
      ctx.lineTo(p.x + 4, p.y - 4);
      ctx.lineTo(p.x, p.y + 2);
      ctx.fill();
      ctx.font = '600 10px "Microsoft YaHei",sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('你', p.x, p.y - 10);
    }
  }
  function splash(a, dt) {
    if (!a.material || a.hidden > 0) return;
    if (Math.random() < dt * (a.moving ? 8 : 2) && ripples.length < 90)
      ripples.push({
        x: a.x,
        z: a.z,
        r: 0.22,
        life: 1,
        color: P.MATERIALS[a.material].light,
      });
    if (reducedMotion || !a.moving || particles.length >= 180) return;
    if (Math.random() < dt * 30) {
      const angle = Math.random() * Math.PI * 2;
      particles.push({
        x: a.x + Math.cos(angle) * 0.4,
        z: a.z + Math.sin(angle) * 0.4,
        y: 0.08,
        vx: Math.cos(angle) * 0.8,
        vz: Math.sin(angle) * 0.8,
        vy: 1.0 + Math.random() * 1.6,
        life: 0.7,
        color: P.MATERIALS[a.material].light,
      });
    }
  }
  function render() {
    ctx.clearRect(0, 0, width, height);
    if (terrainDirty) renderTerrain();
    ctx.drawImage(
      terrainCache,
      0,
      0,
      canvas.width,
      canvas.height,
      0,
      0,
      width,
      height,
    );
    for (const r of ripples) ring(r.x, r.z, r.r, r.color, r.life * 0.65);
    if (pointer && !drag?.orbit && tool !== 'orbit') {
      const p = unproject(pointer.x, pointer.y);
      if (inBounds(p))
        ring(
          p.x,
          p.z,
          tool === 'clone' ? 0.6 : brush / 2,
          tool === 'erase' ? '#fcfff6' : P.MATERIALS[selected].dark,
          0.85,
        );
    }
    [...world.clones, world.player]
      .sort((a, b) => depth(a.x, a.z) - depth(b.x, b.z))
      .forEach(drawActor);
    for (const p of particles) {
      const q = projection(p.x, p.z, p.y);
      ctx.globalAlpha = Math.min(1, p.life * 3);
      ctx.fillStyle = p.color;
      ctx.fillRect(q.x, q.y, 2.5, 2.5);
    }
    ctx.globalAlpha = 1;
  }
  function movement() {
    let x =
      Number(keys.has('d') || keys.has('arrowright')) -
      Number(keys.has('a') || keys.has('arrowleft'));
    let z =
      Number(keys.has('s') || keys.has('arrowdown')) -
      Number(keys.has('w') || keys.has('arrowup'));
    const c = Math.cos(camera.angle),
      s = Math.sin(camera.angle);
    return { x: x * c + z * s, z: -x * s + z * c };
  }
  function ui() {
    const a = world.player;
    const pct = Math.round((a.depth / P.HEIGHT) * 100);
    $('depth-text').textContent = `沉没 ${pct}%`;
    $('depth-fill').style.width = `${pct}%`;
    $('player-state').textContent =
      a.hidden > 0
        ? '回到出生点…'
        : a.material
          ? `${P.MATERIALS[a.material].name}中 · ${a.moving ? '正在挣扎' : '慢慢下沉'}`
          : '站在安全地面';
    $('clone-count').textContent = world.clones.length;
    $('resets').textContent = a.respawns;
    $('coverage').textContent =
      `${Math.round((world.cells.filter(Boolean).length / (P.SIZE * P.SIZE)) * 100)}%`;
    if (a.respawns > lastRespawns) {
      notify('噗通！回到安全区，再试一次吧。');
      lastRespawns = a.respawns;
    }
  }
  function frame(time) {
    const dt = Math.min(0.05, (time - lastTime) / 1000 || 0);
    lastTime = time;
    if (!paused) {
      clock += dt;
      P.step(world, dt, movement());
      [world.player, ...world.clones].forEach((a) => splash(a, dt));
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt;
        p.x += p.vx * dt;
        p.z += p.vz * dt;
        p.y += p.vy * dt;
        p.vy -= dt * 6;
        if (p.life <= 0 || p.y < 0) particles.splice(i, 1);
      }
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.life -= dt * 0.9;
        r.r += dt * 0.8;
        if (r.life <= 0) ripples.splice(i, 1);
      }
    }
    uiTimer += dt;
    if (uiTimer > 0.1) {
      ui();
      uiTimer = 0;
    }
    render();
    requestAnimationFrame(frame);
  }
  function notify(message) {
    $('toast').textContent = message;
    $('toast').classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 3500);
  }
  function inBounds(p) {
    return p.x >= 0 && p.z >= 0 && p.x < P.SIZE && p.z < P.SIZE;
  }
  function local(event) {
    const r = canvas.getBoundingClientRect();
    return { x: event.clientX - r.left, y: event.clientY - r.top };
  }
  function selectTool(next) {
    tool = next;
    document.querySelectorAll('[data-tool]').forEach((b) => {
      const active = b.dataset.tool === tool;
      b.classList.toggle('active', active);
      b.setAttribute('aria-pressed', active);
    });
    $('clone').setAttribute('aria-pressed', tool === 'clone');
    $('tool-hint').textContent = {
      paint: '左键涂画，右键擦除。试着画出一条流沙小路。',
      erase: '左键拖动即可擦除。绿色出生区始终保持安全。',
      orbit: '拖动沙盘旋转视角；滚轮或滑块缩放画面。',
      clone: '点击沙盘放置克隆人。他们会自动漫游，沉没后重新出发。',
    }[tool];
    canvas.style.cursor = tool === 'orbit' ? 'grab' : 'crosshair';
    lastPaint = null;
  }
  function applyBrush(point, erase) {
    const p = unproject(point.x, point.y);
    if (!inBounds(p)) {
      lastPaint = null;
      return;
    }
    if (lastPaint) {
      const distance = Math.hypot(p.x - lastPaint.x, p.z - lastPaint.z),
        n = Math.ceil(distance / 0.35);
      for (let i = 1; i < n; i++)
        P.paint(
          world,
          lastPaint.x + ((p.x - lastPaint.x) * i) / n,
          lastPaint.z + ((p.z - lastPaint.z) * i) / n,
          brush / 2,
          erase ? null : selected,
        );
    }
    P.paint(world, p.x, p.z, brush / 2, erase ? null : selected);
    lastPaint = p;
    terrainDirty = true;
  }
  canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 && event.button !== 1 && event.button !== 2) return;
    event.preventDefault();
    canvas.focus({ preventScroll: true });
    pointer = local(event);
    lastPaint = null;
    drag = {
      id: event.pointerId,
      x: pointer.x,
      y: pointer.y,
      orbit: event.button === 1 || event.altKey || tool === 'orbit',
      erase: event.button === 2 || tool === 'erase',
    };
    canvas.setPointerCapture(event.pointerId);
    if (drag.orbit) {
      canvas.style.cursor = 'grabbing';
      return;
    }
    if (tool === 'clone' && !drag.erase) {
      const p = unproject(pointer.x, pointer.y);
      if (inBounds(p)) {
        const clone = P.spawnClone(world, p.x, p.z);
        notify(
          clone
            ? '克隆人已出发，观察他的脚步吧。'
            : '沙盘已有 24 个克隆人，重置后可以重新放置。',
        );
        ui();
      }
      return;
    }
    applyBrush(pointer, drag.erase);
  });
  canvas.addEventListener('pointermove', (event) => {
    pointer = local(event);
    if (!drag || drag.id !== event.pointerId) return;
    if (drag.orbit) {
      camera.angle += (pointer.x - drag.x) * 0.008;
      camera.tilt = P.clamp(
        camera.tilt + (pointer.y - drag.y) * 0.002,
        0.35,
        0.85,
      );
      terrainDirty = true;
    } else if (tool !== 'clone' || drag.erase) applyBrush(pointer, drag.erase);
    drag.x = pointer.x;
    drag.y = pointer.y;
  });
  function release() {
    drag = null;
    lastPaint = null;
    canvas.style.cursor = tool === 'orbit' ? 'grab' : 'crosshair';
  }
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('lostpointercapture', release);
  canvas.addEventListener('pointerleave', () => {
    if (!drag) pointer = null;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  function zoom(value) {
    camera.zoom = P.clamp(value, 0.6, 1.6);
    $('zoom').value = Math.round(camera.zoom * 100);
    $('zoom-value').textContent = `${Math.round(camera.zoom * 100)}%`;
    resize();
  }
  canvas.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      zoom(camera.zoom * Math.exp(-e.deltaY * 0.001));
    },
    { passive: false },
  );
  $('zoom').addEventListener('input', (e) =>
    zoom(Number(e.target.value) / 100),
  );
  $('brush').addEventListener('input', (e) => {
    brush = Number(e.target.value);
    $('brush-value').textContent = brush;
    $('brush-label').textContent = `画笔 · ${brush} 格`;
  });
  document.querySelectorAll('[data-material]').forEach((button) =>
    button.addEventListener('click', () => {
      selected = button.dataset.material;
      document.querySelectorAll('[data-material]').forEach((b) => {
        const active = b === button;
        b.classList.toggle('selected', active);
        b.setAttribute('aria-pressed', active);
      });
      selectTool('paint');
    }),
  );
  document
    .querySelectorAll('[data-tool]')
    .forEach((b) =>
      b.addEventListener('click', () => selectTool(b.dataset.tool)),
    );
  $('clone').addEventListener('click', () => {
    selectTool(tool === 'clone' ? 'paint' : 'clone');
    if (tool === 'clone') notify('现在点击沙盘，放置一个克隆人。');
  });
  $('view-reset').addEventListener('click', () => {
    camera.angle = -0.68;
    camera.tilt = 0.6;
    zoom(1);
  });
  function setPaused(value) {
    paused = value;
    keys.clear();
    $('pause').setAttribute('aria-pressed', paused);
    $('pause').innerHTML = paused
      ? '▶ <span>继续</span>'
      : 'Ⅱ <span>暂停</span>';
  }
  $('pause').addEventListener('click', () => {
    setPaused(!paused);
    notify(paused ? '实验已暂停，仍然可以编辑沙盘。' : '实验继续。');
  });
  $('reset').addEventListener('click', () => {
    P.reset(world);
    particles.length = 0;
    ripples.length = 0;
    lastRespawns = 0;
    terrainDirty = true;
    setPaused(false);
    ui();
    notify('沙盘已清空，开始你的下一次实验。');
  });
  function help(open) {
    $('help-panel').hidden = !open;
    $('help').setAttribute('aria-expanded', open);
    keys.clear();
    if (open) setPaused(true);
  }
  $('help').addEventListener('click', () => help($('help-panel').hidden));
  $('help-close').addEventListener('click', () => {
    help(false);
    setPaused(false);
    canvas.focus({ preventScroll: true });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      help(false);
      release();
      keys.clear();
      return;
    }
    if (
      e.target.matches('input,textarea,select,button') ||
      !$('help-panel').hidden
    )
      return;
    const key = e.key.toLowerCase();
    if (
      [
        'w',
        'a',
        's',
        'd',
        'arrowup',
        'arrowleft',
        'arrowdown',
        'arrowright',
      ].includes(key)
    ) {
      e.preventDefault();
      keys.add(key);
    }
  });
  document.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => {
    keys.clear();
    release();
  });
  document.addEventListener('visibilitychange', () => {
    keys.clear();
    lastTime = performance.now();
  });
  document.querySelectorAll('[data-move]').forEach((b) => {
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      b.setPointerCapture(e.pointerId);
      keys.add(b.dataset.move);
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'])
      b.addEventListener(type, () => keys.delete(b.dataset.move));
  });
  // The first visit includes four sample pools; reset always produces a genuinely empty board.
  P.paint(world, 10, 9, 3.5, 'sand');
  P.paint(world, 19, 11, 3.6, 'chocolate');
  P.paint(world, 15, 20, 3.8, 'ketchup');
  P.paint(world, 7, 20, 3.2, 'cheese');
  new ResizeObserver(resize).observe(canvas);
  resize();
  ui();
  notify('WASD 移动小人，左键画出你的流沙。');
  requestAnimationFrame(frame);
})();

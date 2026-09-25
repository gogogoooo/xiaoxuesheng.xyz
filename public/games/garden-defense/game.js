(function () {
  'use strict';
  const R = window.GardenRules;
  const $ = (id) => document.getElementById(id);
  const canvas = $('board'),
    ctx = canvas.getContext('2d');
  if (!ctx || !R) {
    $('status-text').textContent = '请使用支持 Canvas 的现代浏览器。';
    return;
  }
  const W = 1000,
    H = 560,
    X = 105,
    Y = 126,
    CW = 92,
    CH = 76;
  const cards = [...document.querySelectorAll('[data-plant]')];
  const settingsPanel = $('settings-panel');
  const settingButtons = [...settingsPanel.querySelectorAll('[data-setting]')];
  let game = R.createGame(),
    selected = 'shooter',
    hover = null;
  let last = 0,
    elapsed = 0,
    announceAt = 0,
    notice = '先选植物，再点击草坪种下它。';
  let lastWave = 1,
    lastStatus = 'playing';
  const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rand = (a, b) => a + Math.random() * (b - a);
  function line(x1, y1, x2, y2, color, width = 1) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }
  function round(x, y, w, h, r, fill, stroke) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
  function circle(x, y, r, fill, stroke, width = 1) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.lineWidth = width;
      ctx.strokeStyle = stroke;
      ctx.stroke();
    }
  }
  function ellipse(x, y, rx, ry, fill) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
  }
  function text(value, x, y, size, color, weight = '600', align = 'center') {
    ctx.textAlign = align;
    ctx.font = `${weight} ${size}px "Microsoft YaHei", "Segoe UI",sans-serif`;
    ctx.fillStyle = color;
    ctx.fillText(value, x, y);
  }
  function leaf(x, y, angle, color, scale = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(scale, scale);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(21, -21, 30, -7);
    ctx.quadraticCurveTo(16, 13, 0, 0);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }
  function seed() {
    let value = 0;
    return () => {
      value = (value * 1664525 + 1013904223) >>> 0;
      return value / 4294967296;
    };
  }
  const fieldRandom = seed();
  function drawBackdrop() {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#d5e9cd');
    sky.addColorStop(0.46, '#e7efcb');
    sky.addColorStop(1, '#f6e8bd');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);
    circle(861, 58, 35, '#ffe6a1');
    circle(861, 58, 46, '#ffe6a133');
    for (let i = 0; i < 4; i++) {
      ellipse(180 + i * 210, 78 + (i % 2) * 13, 95, 17, '#ffffff78');
    }
    for (let i = 0; i < 12; i++) {
      const x = i * 105 - 40;
      ellipse(x, 116, 75, 30, '#a0c68b');
      ellipse(x + 35, 109, 59, 28, '#b8d4a0');
    }
    round(0, 108, W, H - 108, 0, '#cad6a4');
    for (let i = 0; i < 24; i++) {
      const x = (i * 67) % 1000,
        y = 113 + ((i * 47) % 32);
      circle(x, y, 2, '#f5eda1');
    }
    round(18, 115, 81, 397, 17, '#b99d77', '#a78d69');
    round(28, 123, 62, 379, 12, '#d9c2a1');
    for (let i = 0; i < 10; i++)
      line(34, 145 + i * 37, 83, 145 + i * 37, '#bfa888', 2);
    text('花', 59, 95, 21, '#49784a');
    text('园', 59, 531, 19, '#6b7f56');
    round(X - 7, Y - 7, CW * 9 + 14, CH * 5 + 14, 12, '#6c9456', '#63844b');
    for (let row = 0; row < 5; row++)
      for (let col = 0; col < 9; col++) {
        const x = X + col * CW,
          y = Y + row * CH;
        ctx.fillStyle = (row + col) % 2 ? '#9bc778' : '#a9d083';
        ctx.fillRect(x, y, CW, CH);
        ctx.strokeStyle = '#ffffff20';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, CW - 1, CH - 1);
        const n = (row * 13 + col * 41) % 9;
        if (n < 4) {
          line(x + 15 + n * 10, y + 55, x + 16 + n * 10, y + 49, '#77ab60', 1);
          line(x + 16 + n * 10, y + 49, x + 20 + n * 10, y + 53, '#77ab60', 1);
        }
      }
    if (
      hover &&
      game.status === 'playing' &&
      hover.col >= 0 &&
      hover.col < 9 &&
      hover.row >= 0 &&
      hover.row < 5
    ) {
      ctx.fillStyle = selected === 'shovel' ? '#f8e0b76b' : '#e9f7bd6b';
      ctx.fillRect(
        X + hover.col * CW + 2,
        Y + hover.row * CH + 2,
        CW - 4,
        CH - 4,
      );
    }
    round(0, 516, W, 44, 0, '#758e65');
    for (let i = 0; i < 18; i++) {
      const x = (i * 59) % W;
      line(x, 523, x + 4, 520, '#b9d095', 2);
    }
  }
  function face(x, y, size = 1) {
    circle(x - 6 * size, y, 2 * size, '#344736');
    circle(x + 6 * size, y, 2 * size, '#344736');
    ctx.beginPath();
    ctx.arc(x, y + 4 * size, 4 * size, 0, Math.PI);
    ctx.strokeStyle = '#506a43';
    ctx.lineWidth = 1.3;
    ctx.stroke();
  }
  function drawPlant(p) {
    const x = X + (p.col + 0.5) * CW,
      y = Y + (p.row + 0.5) * CH;
    ellipse(x, y + 24, 27, 7, '#4c7f3d60');
    const bob = prefersReduced ? 0 : Math.sin(elapsed * 2.3 + p.id) * 1.5;
    ctx.save();
    ctx.translate(0, bob);
    if (p.type === 'shooter') {
      line(x, y + 22, x, y - 5, '#3b8542', 8);
      leaf(x - 2, y + 8, 2.7, '#2e8b47', 0.7);
      leaf(x + 2, y + 14, -0.3, '#4fa65c', 0.65);
      circle(x - 4, y - 13, 21, '#5caa54', '#398249', 2);
      circle(x + 12, y - 15, 14, '#69b85e');
      round(x + 13, y - 23, 21, 15, 7, '#448a45');
      circle(x + 30, y - 16, 7, '#377d3d');
      circle(x - 8, y - 18, 2, '#253d31');
      circle(x - 3, y - 17, 2, '#253d31');
    } else if (p.type === 'sunflower') {
      line(x, y + 24, x, y - 4, '#4b8f46', 7);
      leaf(x - 3, y + 11, 2.7, '#65a851', 0.75);
      leaf(x + 3, y + 17, -0.3, '#82b95b', 0.65);
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 6 + elapsed * 0.04;
        ellipse(
          x + Math.cos(a) * 20,
          y - 18 + Math.sin(a) * 20,
          7,
          12,
          '#f9c74d',
        );
      }
      circle(x, y - 18, 20, '#9a613b', '#7a5435', 2);
      circle(x - 5, y - 19, 1.8, '#fff0ca');
      circle(x + 5, y - 19, 1.8, '#fff0ca');
      ctx.beginPath();
      ctx.arc(x, y - 15, 6, 0, Math.PI);
      ctx.strokeStyle = '#f9dfae';
      ctx.lineWidth = 1.8;
      ctx.stroke();
    } else if (p.type === 'wall') {
      round(x - 24, y - 27, 48, 54, 17, '#b58c62', '#8d6d4f');
      round(x - 18, y - 21, 36, 44, 12, '#caa376');
      face(x, y - 1, 0.8);
      if (p.hp < R.PLANTS.wall.hp * 0.5) {
        line(x - 8, y + 7, x - 4, y + 14, '#835f46', 2);
        line(x - 4, y + 14, x - 10, y + 19, '#835f46', 2);
      }
    } else if (p.type === 'ice') {
      line(x, y + 22, x, y - 5, '#5b9ea6', 7);
      leaf(x - 3, y + 11, 2.7, '#72b8b0', 0.66);
      circle(x - 4, y - 14, 21, '#8fd4e5', '#579eb8', 2);
      round(x + 11, y - 21, 21, 14, 6, '#61b0c6');
      circle(x + 29, y - 14, 6, '#4599b1');
      circle(x - 9, y - 19, 2, '#2f637b');
      for (let i = 0; i < 5; i++) {
        const a = (i * Math.PI * 2) / 5;
        line(
          x - 4,
          y - 14,
          x - 4 + Math.cos(a) * 17,
          y - 14 + Math.sin(a) * 17,
          '#dffaff',
          1.5,
        );
      }
    } else if (p.type === 'spike') {
      ellipse(x, y + 19, 30, 12, '#8d865c');
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(x + i * 11 - 7, y + 20);
        ctx.lineTo(x + i * 11, y - 8 - (i % 2 === 0 ? 8 : 0));
        ctx.lineTo(x + i * 11 + 7, y + 20);
        ctx.closePath();
        ctx.fillStyle = i % 2 === 0 ? '#9b7b55' : '#b89665';
        ctx.fill();
      }
    } else if (p.type === 'twin') {
      line(x, y + 23, x, y - 8, '#4f9653', 8);
      leaf(x - 3, y + 13, 2.7, '#5dae65', 0.7);
      leaf(x + 3, y + 17, -0.3, '#78bd6f', 0.7);
      circle(x - 13, y - 16, 17, '#6db96c', '#448c53', 2);
      circle(x + 13, y - 16, 17, '#6db96c', '#448c53', 2);
      round(x - 36, y - 22, 20, 13, 6, '#458e50');
      round(x + 16, y - 22, 20, 13, 6, '#458e50');
      circle(x - 37, y - 15, 5, '#397c45');
      circle(x + 37, y - 15, 5, '#397c45');
      circle(x - 10, y - 20, 2, '#2d5938');
      circle(x + 10, y - 20, 2, '#2d5938');
    } else {
      line(x, y + 20, x, y - 6, '#3e7d43', 6);
      leaf(x - 3, y + 10, 2.5, '#5d9c52', 0.55);
      circle(x, y - 15, 21, '#eb7470', '#b74649', 2);
      circle(x - 7, y - 19, 5, '#ffaea0');
      for (let i = 0; i < 5; i++) {
        const a = (i * Math.PI * 2) / 5;
        leaf(x + Math.sin(a) * 6, y - 33 + Math.cos(a) * 4, a, '#457f42', 0.45);
      }
      face(x, y - 11, 0.7);
    }
    ctx.restore();
    if (p.hp < R.PLANTS[p.type].hp * 0.65) {
      round(x - 18, y + 31, 36, 4, 2, '#526f4755');
      round(x - 18, y + 31, (36 * p.hp) / R.PLANTS[p.type].hp, 4, 2, '#f0c35c');
    }
  }
  function drawZombie(z) {
    const x = X + z.x * CW,
      y = Y + (z.row + 0.5) * CH;
    ellipse(x, y + 30, 25, 6, '#43643b50');
    const bob = prefersReduced ? 0 : Math.sin(elapsed * 6 + z.id) * 2;
    ctx.save();
    ctx.translate(x, y + bob);
    line(-9, 9, -13, 29, '#455c65', 9);
    line(10, 9, 13, 29, '#455c65', 9);
    round(-19, -12, 38, 32, 7, '#5f7480', '#415a61');
    line(-17, -3, -32, 7, '#abc6a1', 8);
    line(17, -3, 28, 6, '#abc6a1', 8);
    circle(0, -29, 18, '#b7cda9', '#82aa8e', 2);
    round(-12, -30, 25, 9, 4, '#f2e8d3');
    circle(-7, -35, 3, '#34483b');
    circle(6, -35, 3, '#34483b');
    line(-4, -20, 7, -20, '#667959', 2);
    if (z.type === 'cone') {
      ctx.beginPath();
      ctx.moveTo(-17, -44);
      ctx.lineTo(0, -77);
      ctx.lineTo(18, -44);
      ctx.closePath();
      ctx.fillStyle = '#dc8843';
      ctx.fill();
      round(-22, -47, 44, 7, 3, '#f4bc67');
      line(-9, -57, 7, -57, '#f6c481', 2);
    } else {
      round(-17, -51, 34, 10, 5, '#765f65');
    }
    ctx.restore();
    if (z.slow > 0) {
      circle(x, y - 29, 22, null, '#a8e4f5', 3);
      circle(x + 15, y - 45, 3, '#e4faff');
    }
    if (z.hp < R.ZOMBIES[z.type].hp * 0.75) {
      round(x - 17, y - 61, 34, 4, 2, '#48624988');
      round(
        x - 17,
        y - 61,
        (34 * Math.max(0, z.hp)) / R.ZOMBIES[z.type].hp,
        4,
        2,
        '#f2d77e',
      );
    }
  }
  function drawMower(m) {
    if (m.used && !m.active) return;
    const x = X + m.x * CW,
      y = Y + (m.row + 0.5) * CH;
    ctx.save();
    ctx.translate(x, y);
    ellipse(0, 20, 25, 5, '#41684066');
    round(-20, -7, 35, 25, 7, '#e58460', '#bd6248');
    round(-14, -13, 24, 9, 4, '#f2ab79');
    circle(-12, 18, 6, '#53685a');
    circle(12, 18, 6, '#53685a');
    line(12, -6, 27, -17, '#796c56', 3);
    ctx.restore();
  }
  function drawSun(d) {
    const x = X + d.x * CW,
      y =
        Y +
        (d.row + 0.5) * CH -
        17 +
        (prefersReduced ? 0 : Math.sin(elapsed * 2 + d.id) * 4);
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI) / 5 + elapsed * 0.15;
      line(
        x + Math.cos(a) * 21,
        y + Math.sin(a) * 21,
        x + Math.cos(a) * 27,
        y + Math.sin(a) * 27,
        '#f8dd73',
        3,
      );
    }
    circle(x, y, 20, '#ffdf6c', '#f3bb40', 2);
    circle(x - 6, y - 3, 2, '#ab762a');
    circle(x + 6, y - 3, 2, '#ab762a');
    ctx.beginPath();
    ctx.arc(x, y + 1, 5, 0, Math.PI);
    ctx.strokeStyle = '#b68135';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  function drawBoard() {
    drawBackdrop();
    const actors = [
      ...game.plants.map((p) => ({ row: p.row, kind: 'plant', ref: p })),
      ...game.zombies.map((z) => ({ row: z.row, kind: 'zombie', ref: z })),
      ...game.mowers.map((m) => ({ row: m.row, kind: 'mower', ref: m })),
    ];
    actors.sort(
      (a, b) =>
        a.row - b.row || (a.kind === 'mower' ? -1 : a.kind === 'plant' ? 0 : 1),
    );
    for (const item of actors) {
      if (item.kind === 'plant') drawPlant(item.ref);
      else if (item.kind === 'zombie') drawZombie(item.ref);
      else drawMower(item.ref);
    }
    for (const shot of game.shots) {
      const x = X + shot.x * CW,
        y = Y + (shot.row + 0.5) * CH - 13;
      circle(
        x,
        y,
        8,
        shot.slow ? '#b9e8f5' : '#a4d879',
        shot.slow ? '#66afc9' : '#4f9954',
        1,
      );
      circle(x - 2, y - 3, 2, '#effffd');
    }
    for (const d of game.sunDrops) drawSun(d);
    for (const e of game.effects) {
      const x = X + e.x * CW,
        y = Y + (e.row + 0.5) * CH;
      ctx.globalAlpha = Math.min(1, e.ttl * 2);
      if (e.type === 'burst') {
        circle(x, y, 50 + (1 - e.ttl) * 34, '#ffd56f99');
        for (let i = 0; i < 10; i++) {
          const a = (i * Math.PI) / 5;
          circle(x + Math.cos(a) * 45, y + Math.sin(a) * 45, 5, '#f6ad63');
        }
      } else circle(x, y - 14, 13, '#eff8c38a');
      ctx.globalAlpha = 1;
    }
    if (game.status === 'paused') {
      ctx.fillStyle = '#193e3680';
      ctx.fillRect(0, 0, W, H);
      text('游戏暂停', W / 2, H / 2, 41, '#fff9de');
      text('点击继续，花园还在等你', W / 2, H / 2 + 35, 16, '#e5f4db', '400');
    }
  }
  function choose(type) {
    selected = type;
    cards.forEach((card) => {
      const on = card.dataset.plant === type;
      card.classList.toggle('selected', on);
      card.setAttribute('aria-pressed', on);
    });
    $('shovel').classList.toggle('selected', type === 'shovel');
    $('shovel').setAttribute('aria-pressed', type === 'shovel');
  }
  function updateSettingsButtons() {
    settingButtons.forEach((button) => {
      button.setAttribute(
        'aria-pressed',
        Number(button.dataset.value) === game.settings[button.dataset.setting],
      );
    });
  }
  function say(message) {
    notice = message;
    announceAt = elapsed + 3;
    $('status-text').textContent = message;
  }
  function updateHUD() {
    $('sun-count').textContent = game.sun;
    $('wave-label').textContent = `第 ${game.wave} / 3 波`;
    const total = game.wave === 1 ? 5 : game.wave === 2 ? 7 : 10;
    $('wave-progress').style.width =
      `${Math.round(((game.wave - 1 + (1 - game.spawnsLeft / total)) / 3) * 100)}%`;
    for (const card of cards) {
      const type = card.dataset.plant,
        config = R.PLANTS[type];
      const cool = game.cooldowns[type] / config.cooldown;
      card.classList.toggle('disabled', game.sun < config.cost || cool > 0.01);
      card.querySelector('.cooldown').style.width =
        `${Math.round(cool * 100)}%`;
    }
    if (game.wave !== lastWave) {
      say(`第 ${game.wave} 波来了！守住每一行。`);
      lastWave = game.wave;
    }
    if (game.status !== lastStatus) {
      if (game.status === 'won' || game.status === 'lost') {
        $('result').hidden = false;
        $('result-icon').textContent = game.status === 'won' ? '✿' : '☁';
        $('result-title').textContent =
          game.status === 'won' ? '守住了花园！' : '再种一次吧';
        $('result-description').textContent =
          game.status === 'won'
            ? '三波小怪物都退下了，辛苦啦。'
            : '小怪物溜进了花园，下次试试多种一排坚果盾。';
      }
      lastStatus = game.status;
    }
    if (announceAt < elapsed && game.status === 'playing')
      $('status-text').textContent = game.nextWaveAt
        ? '下一波正在靠近，趁现在收集阳光。'
        : '点击阳光收集；选植物后点空格种植。';
  }
  function loop(now) {
    let dt = Math.min((now - last) / 1000 || 0, 0.05);
    last = now;
    elapsed += dt;
    R.tick(game, dt);
    drawBoard();
    updateHUD();
    requestAnimationFrame(loop);
  }
  function point(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) * W) / r.width,
      y: ((e.clientY - r.top) * H) / r.height,
    };
  }
  function cell(p) {
    return { row: Math.floor((p.y - Y) / CH), col: Math.floor((p.x - X) / CW) };
  }
  canvas.addEventListener('pointermove', (e) => {
    const p = point(e);
    hover = cell(p);
  });
  canvas.addEventListener('pointerleave', () => (hover = null));
  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || game.status !== 'playing') return;
    e.preventDefault();
    canvas.focus({ preventScroll: true });
    const p = point(e);
    const picked = game.sunDrops.find(
      (d) =>
        Math.hypot(p.x - (X + d.x * CW), p.y - (Y + (d.row + 0.5) * CH - 17)) <
        30,
    );
    if (picked) {
      R.collectSun(game, picked.id);
      say(`收到了 ${picked.value} 点阳光！`);
      return;
    }
    const { row, col } = cell(p);
    if (row < 0 || row >= R.ROWS || col < 0 || col >= R.COLS) return;
    if (selected === 'shovel') {
      say(
        R.shovel(game, row, col)
          ? '植物已移走，可以种新的了。'
          : '这一格还没有植物。',
      );
      return;
    }
    if (R.plant(game, row, col, selected)) {
      say(`${R.PLANTS[selected].name}已经种下了！`);
      return;
    }
    const config = R.PLANTS[selected];
    say(
      game.sun < config.cost
        ? '阳光还不够，点太阳收集吧。'
        : game.cooldowns[selected] > 0.01
          ? '这株植物还在休息，稍等一下。'
          : '这格已经有植物，换一格试试。',
    );
  });
  cards.forEach((card) =>
    card.addEventListener('click', () => choose(card.dataset.plant)),
  );
  settingsPanel.addEventListener('click', (event) => {
    const button = event.target.closest('[data-setting][data-value]');
    if (!button || !settingsPanel.contains(button)) return;
    const key = button.dataset.setting;
    const value = Number(button.dataset.value);
    if (R.setSetting(game, key, value)) {
      updateSettingsButtons();
      say('游戏设置已更新。');
    }
  });
  $('shovel').addEventListener('click', () => choose('shovel'));
  function togglePause() {
    if (game.status === 'won' || game.status === 'lost') return;
    game.status = game.status === 'paused' ? 'playing' : 'paused';
    $('pause').setAttribute('aria-pressed', game.status === 'paused');
    $('pause').innerHTML =
      game.status === 'paused' ? '▶ <span>继续</span>' : 'Ⅱ <span>暂停</span>';
    say(game.status === 'paused' ? '游戏暂停了，休息一下。' : '继续守护花园！');
  }
  function restart() {
    game = R.createGame(Math.random, game.settings);
    elapsed = 0;
    lastWave = 1;
    lastStatus = 'playing';
    $('result').hidden = true;
    $('pause').innerHTML = 'Ⅱ <span>暂停</span>';
    $('pause').setAttribute('aria-pressed', 'false');
    choose('shooter');
    updateSettingsButtons();
    say('新的花园准备好了，开始种植物吧。');
    updateHUD();
  }
  $('pause').addEventListener('click', togglePause);
  $('restart').addEventListener('click', restart);
  $('play-again').addEventListener('click', restart);
  document.addEventListener('keydown', (e) => {
    if (e.target.matches('button,input,textarea,select')) return;
    if (['1', '2', '3', '4', '5', '6', '7'].includes(e.key)) {
      choose(
        ['shooter', 'sunflower', 'wall', 'bomb', 'ice', 'spike', 'twin'][
          Number(e.key) - 1
        ],
      );
      say(`已选择${R.PLANTS[selected].name}。`);
    }
    if (e.code === 'Space') {
      e.preventDefault();
      togglePause();
    }
    if (e.key.toLowerCase() === 'r') restart();
  });
  window.addEventListener('blur', () => {
    if (game.status === 'playing') togglePause();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && game.status === 'playing') togglePause();
    last = performance.now();
  });
  choose('shooter');
  updateSettingsButtons();
  updateHUD();
  requestAnimationFrame(loop);
})();

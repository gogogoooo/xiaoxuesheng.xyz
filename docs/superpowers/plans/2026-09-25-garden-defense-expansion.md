# 花园防线扩展实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 缩小花园防线页面，在局内加入三组档位设置，并增加冰冻射手、地刺、双向射手。

**Architecture:** `rules.js` 仍是无 DOM 的规则模块，保存档位与全部战斗状态；`game.js` 只负责 Canvas 绘制、设置按钮和触控输入。`index.html` 与 `style.css` 提供紧凑且可横向滚动的界面。新代码仅落在游戏目录和对应测试中。

**Tech Stack:** 纯 HTML、CSS、JavaScript、Canvas；Node 内置 `node:test`、`vm`；站点用 vinext 静态构建。

## Global Constraints

- 以 `docs/superpowers/specs/2026-09-25-garden-defense-expansion-design.md` 为准；5×9 草坪逻辑坐标与 1000×560 Canvas 像素不变。
- 默认档位：每朵阳光 25、豆豆射手连发 1、冰冻／双向射手共用攻击间隔 1.5 秒；档位分别限定为 `[25,50,100,200,500]`、`[1,2,4,8,16]`、`[0.25,0.5,1,1.5,2]`。
- 三组档位局内立即生效，重开保留、刷新恢复默认；无服务端、无第三方素材、无本地存储；不改网站其他栏目，不推送线上。
- 新植物：冰冻射手 125 阳光／7 秒冷却／140 生命／16 伤害／50% 移速持续 3 秒；地刺 75／8 秒／180 生命／本格 45 DPS；双向射手 175／9 秒／140 生命／每方向 24 伤害。

---

### Task 1: 设置状态与原有植物连发

**Files:**
- Modify: `public/games/garden-defense/rules.js`
- Create: `tests/garden-defense-expansion.test.mjs`

**Interfaces:**
- Consumes: `GardenRules.createGame(random)`、`dropSun`、`collectSun`、`tick`。
- Produces: `GardenRules.SETTING_OPTIONS`、`GardenRules.setSetting(game, key, value)`、`GardenRules.createGame(random, settings)`，其中 `settings` 只包含 `sunValue`、`volley`、`specialInterval`。

- [ ] **Step 1: 写失败测试。** 使用 `node:test`、`vm` 加载真实 `rules.js`，分别断言默认设置、非法档位被拒绝、改变 `sunValue` 同步更新场上未领取阳光、`volley=4` 时豆豆射手一次增加 4 发弹丸，`createGame(random, old.settings)` 保留所选档位。
```js
assert.equal(g.settings.sunValue, 25);
assert.equal(R.setSetting(g, 'sunValue', 100), true);
assert.equal(R.setSetting(g, 'sunValue', 123), false);
assert.equal(R.dropSun(g, 3, 1).value, 100);
assert.equal(R.setSetting(g, 'volley', 4), true);
assert.equal(R.createGame(() => 0.5, g.settings).settings.volley, 4);
```
- [ ] **Step 2: 运行红灯。** `node --test tests/garden-defense-expansion.test.mjs`，预期因 `settings` / `setSetting` 缺失而失败。
- [ ] **Step 3: 最小实现。** 在 `rules.js` 定义 `SETTING_OPTIONS`；`createGame` 复制传入的合法档位；`setSetting` 验证键与备选值，更新未领取太阳；`dropSun` 默认读取 `g.settings.sunValue`；原有豆豆射手按 `g.settings.volley` 循环生成 24 伤害弹丸并令起点以 `0.035` 格间隔错开。
```js
const SETTING_OPTIONS = {
  sunValue: [25, 50, 100, 200, 500],
  volley: [1, 2, 4, 8, 16],
  specialInterval: [0.25, 0.5, 1, 1.5, 2],
};
function setSetting(g, key, value) {
  if (!SETTING_OPTIONS[key]?.includes(value)) return false;
  g.settings[key] = value;
  if (key === 'sunValue') for (const drop of g.sunDrops) drop.value = value;
  return true;
}
```
- [ ] **Step 4: 运行绿灯与旧规则。** `node --test tests/garden-defense-expansion.test.mjs tests/garden-defense.test.mjs`，预期全部通过。
- [ ] **Step 5: 提交。** `git add public/games/garden-defense/rules.js tests/garden-defense-expansion.test.mjs`；`git commit -m "feat: add garden gameplay settings"`。

### Task 2: 三种新植物及攻击规则

**Files:**
- Modify: `public/games/garden-defense/rules.js`
- Modify: `tests/garden-defense-expansion.test.mjs`

**Interfaces:**
- Consumes: Task 1 的 `g.settings.specialInterval` 与 `setSetting`。
- Produces: `PLANTS.ice`、`PLANTS.spike`、`PLANTS.twin`；弹丸字段 `direction: 1 | -1` 和可选 `slow: 3`；僵尸 `slow` 为剩余秒数。

- [ ] **Step 1: 写失败测试。** 对三种新植物分别断言 `plant` 扣费及冷却；冰冻弹丸命中后 `z.slow>0` 且移动量为未冰冻状态约一半；地刺只伤本行本格敌人；双向射手对左右敌人各发一弹；切换共用间隔后两者下一轮射击均使用新档位，弹丸出界被清理。
```js
assert.equal(R.plant(g, 1, 2, 'ice'), true);
assert.equal(R.PLANTS.ice.cost, 125);
assert.equal(R.setSetting(g, 'specialInterval', 0.25), true);
assert.equal(R.plant(g, 2, 2, 'spike'), true);
assert.equal(R.plant(g, 3, 4, 'twin'), true);
```
- [ ] **Step 2: 运行红灯。** `node --test tests/garden-defense-expansion.test.mjs`，预期新植物与方向行为断言失败。
- [ ] **Step 3: 最小实现。** 给 `PLANTS` 加三个配置，`createGame` 冷却表按配置键生成；`tick` 的植物阶段增加冰冻、地刺、双向射击；弹丸移动与碰撞按方向排序选择首个敌人，命中冰冻弹时设置 `z.slow=3`；敌人移动时对剩余减速计时并乘 `0.5`；左右弹丸越界清理。
```js
const direction = shot.direction ?? 1;
shot.x += direction * 4.6 * dt;
const slowedSpeed = z.slow > 0 ? ZOMBIES[z.type].speed * 0.5 : ZOMBIES[z.type].speed;
z.x -= slowedSpeed * dt;
```
- [ ] **Step 4: 运行绿灯与旧规则。** `node --test tests/garden-defense-expansion.test.mjs tests/garden-defense.test.mjs`，预期全部通过。
- [ ] **Step 5: 提交。** `git add public/games/garden-defense/rules.js tests/garden-defense-expansion.test.mjs`；`git commit -m "feat: add three garden plants"`。

### Task 3: 紧凑页面、档位控件与原创绘制

**Files:**
- Modify: `public/games/garden-defense/index.html`
- Modify: `public/games/garden-defense/style.css`
- Modify: `public/games/garden-defense/game.js`
- Modify: `tests/garden-defense-expansion.test.mjs`

**Interfaces:**
- Consumes: Task 1/2 的 `SETTING_OPTIONS`、`setSetting`、七种 `PLANTS` 与弹丸 `direction`。
- Produces: 三组 `data-setting` 按钮、七张 `data-plant` 卡片、`#settings-panel`；重开传递 `game.settings`。

- [ ] **Step 1: 写失败测试。** 静态读取真实 HTML/CSS/JS，断言七张植物卡、三组档位控件、`<details id="settings-panel">`、CSS 最大宽度 1240px／草坪最小宽 650px、JS 重开保留 `game.settings`；旧离线资源测试继续保留。
```js
for (const type of ['shooter','sunflower','wall','bomb','ice','spike','twin'])
  assert.match(html, new RegExp(`data-plant="${type}"`));
for (const key of ['sunValue','volley','specialInterval'])
  assert.match(html, new RegExp(`data-setting="${key}"`));
assert.match(html, /id="settings-panel"/);
```
- [ ] **Step 2: 运行红灯。** `node --test tests/garden-defense-expansion.test.mjs`，预期新界面断言失败。
- [ ] **Step 3: 最小实现。** `index.html` 添加可展开设置区、七张卡并更新键盘提示；`game.js` 将设置按钮按数字值传给 `R.setSetting`、更新 `aria-pressed`、重开调用 `R.createGame(Math.random, game.settings)`，为三种新植物与不同方向弹丸增加不同的 Canvas 图形；`style.css` 收紧 `.app-shell` 到 1240px、草坪最大 1040px 与最小 650px，植物栏单行横向滚动，设置区展开时不覆盖草坪。
```js
settingsPanel.addEventListener('click', (event) => {
  const button = event.target.closest('[data-setting][data-value]');
  if (!button) return;
  R.setSetting(game, button.dataset.setting, Number(button.dataset.value));
  updateSettingsButtons();
});
```
- [ ] **Step 4: 运行绿灯。** `node --test tests/garden-defense-expansion.test.mjs tests/garden-defense.test.mjs`，预期全部通过。
- [ ] **Step 5: 提交。** `git add public/games/garden-defense tests/garden-defense-expansion.test.mjs`；`git commit -m "feat: add compact garden controls and plant art"`。

### Task 4: 全站回归与本地试玩

**Files:**
- Modify: `public/games/garden-defense/README.md`（记录七种植物、三个设置、离线运行方式）

**Interfaces:**
- Consumes: Tasks 1–3 的游戏页面与规则。
- Produces: 本地试玩 URL；不推送仓库、不部署 Cloudflare。

- [ ] **Step 1: 验证全部测试。** `node --test tests/*.test.mjs`，预期 0 fail。
- [ ] **Step 2: 检查脚本与静态构建。** `node --check public/games/garden-defense/rules.js`、`node --check public/games/garden-defense/game.js`、`node node_modules/vinext/dist/cli.js build`，预期各命令退出码 0。
- [ ] **Step 3: 本地浏览器试玩。** 从 `dist/client` 启动静态 HTTP 预览，桌面、约 800px 平板和约 390px 手机分别检查布局、横向滚动、三组设置、植物种植、阳光变化、暂停和重开；检查浏览器控制台无错误。
- [ ] **Step 4: 更新中文说明并检查差异。** README 说明新增植物、数值与设置；`git diff --check`、`git status --short`，预期无意外文件；提交 README。


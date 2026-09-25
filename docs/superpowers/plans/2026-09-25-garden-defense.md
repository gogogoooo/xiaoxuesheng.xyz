# 花园防线实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增离线 5×9 植物塔防，并从网站小程序 / Demo / 工具页面进入。

**Architecture:** 规则与 Canvas 视图分离，所有游戏代码在独立静态文件夹中；现有站点只增加入口卡片。

**Tech Stack:** HTML、CSS、原生 JavaScript、Canvas、Node 内置 test/vm、Vinext 静态导出。

## Global Constraints

- 离线打开 `index.html` 可运行，不引入网络资源或后端。
- 原创画面，不引用原作受保护素材。
- 不触碰其他实验室的开发工作区。

### Task 1: 核心规则

**Files:** `tests/garden-defense.test.mjs`；`public/games/garden-defense/rules.js`

**Interfaces:** `GardenRules.createGame(random)` 创建状态；`GardenRules.plant(game,row,col,type)` 返回布尔值；`GardenRules.tick(game,seconds)` 更新状态；`GardenRules.collectSun(game,id)` 返回布尔值；`GardenRules.shovel(game,row,col)` 返回布尔值。

- [ ] 先写测试：150 阳光可种向日花但不能在同一格重复种；射手攻击同一行僵尸；阳光收集后资源增加；铲子移除植物；割草机仅救场一次；三波清空后获胜。
- [ ] 运行 `node --test tests/garden-defense.test.mjs`，确认缺少 `GardenRules` 时失败。
- [ ] 用确定性时间推进实现规则及边界处理。
- [ ] 重跑规则测试，确认全部通过。

### Task 2: 离线界面

**Files:** `public/games/garden-defense/index.html`、`style.css`、`game.js`、`README.md`

**Interfaces:** 普通脚本加载 `rules.js`；Canvas 视图只调用 Task 1 公开函数。

- [ ] 测试 HTML 仅引用本目录存在的相对文件，并暴露 5×9 Canvas、四张植物卡、铲子、暂停与重开按钮。
- [ ] 运行测试，确认界面文件缺失失败。
- [ ] 实现原创画面、鼠标/触屏/键盘输入及实时状态提示。
- [ ] 运行规则和界面测试、`node --check public/games/garden-defense/game.js`。

### Task 3: 网站接入与构建

**Files:** `app/apps/page.tsx`、`app/gallery-overrides.css`

- [ ] 先断言 `/apps` 存在指向 `/games/garden-defense/` 的游戏入口。
- [ ] 运行测试确认缺失，再增加页面卡片与响应式预览。
- [ ] 运行 `node --test tests/garden-defense.test.mjs`、`node tests/site-content.test.mjs`、`node tests/circuit.test.mjs`，执行静态构建，并检查 `dist/client/games/garden-defense/index.html`。
- [ ] 检查 `git diff --check` 与分支状态，保存独立提交。

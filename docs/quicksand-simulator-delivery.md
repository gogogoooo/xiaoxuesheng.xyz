# 流沙模拟器开发交接

## 项目位置

- 分支：`codex/quicksand-simulator`，基于 `origin/main` 的 `b73e7c0` 创建。
- 工作区：`.worktrees/quicksand-simulator`。
- 独立游戏目录：`public/games/quicksand-simulator/`。
- 网站入口：`app/apps/page.tsx`，新增第二张卡片；卡片样式在 `app/gallery-overrides.css`。
- 部署后的路由：`/games/quicksand-simulator/`。

全部游戏文件在独立目录，经典 JavaScript 脚本直接加载，无 CDN、后端、网络请求。复制整个目录后双击 `index.html` 可本地运行。操作及结构说明见游戏目录中的 README。

## 验证（2026-09-18）

- `node --test tests/quicksand.test.mjs tests/quicksand-runtime.test.mjs`：11 项通过。
- `node tests/site-content.test.mjs`：13 项通过。
- `node tests/circuit.test.mjs`：9 项通过。
- 静态构建成功，9 个路由预渲染，游戏文件包含在 `dist/client/games/quicksand-simulator/`。
- 本地 HTTP 游戏路由返回 200，`apps.html` 包含新入口。
- 页面脚本通过 DOM/Canvas 适配器测试：初始化、绘制、擦除、克隆、重置、相机、帮助和暂停。该测试不替代真实浏览器视觉验证。
- 浏览器自动化无可用连接，尚未完成实机点击、截图和手机视觉验证。

## 本地构建说明

本工作区的 node_modules 是指向已有网站工作区依赖的本地 junction，没有加入 Git。本机 pnpm 包装器尝试重装共享依赖，因此验证时直接执行 `node node_modules/vinext/dist/cli.js build`，与 package.json 的 build 脚本调用同一构建程序。独立机器正常安装依赖后可执行 `pnpm build`。

## 发布边界

本次完成本地开发和验证，未合并生产分支或发布线上。确认试玩后将本分支合并到网站生产 `main`，由现有 Cloudflare Pages Git 集成发布；不创建额外 Worker 或覆盖其他任务的工作区。

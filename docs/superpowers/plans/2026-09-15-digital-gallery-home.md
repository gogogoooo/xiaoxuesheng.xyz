# 数字作品展厅首页实施计划

> **给执行型智能体：** 必须使用 `subagent-driven-development`（推荐）或 `executing-plans` 逐任务执行；步骤使用复选框追踪。

**目标：** 将首页改造成具备作品展厅质感的数字门户，同时保持现有三大入口与可扩展数据结构。

**架构：** 保持 `siteSections`、`EntryCard` 和 `SiteShell` 的组件边界，重构首页结构及 `app/site.css` 的站点样式。卡片仍从数据数组生成，利用网格规则强调第一项而非把布局固定在 JSX 中。

**技术栈：** React 19、Next App Router、TypeScript、CSS、lucide-react、Node 测试。

## 全局约束

- 可见文案、规格和计划使用中文。
- 首页保留 `/lab`、`/apps`、`/works` 三个入口及其现有路由。
- 电脑与手机均无横向滚动；支持键盘焦点与减少动态效果偏好。
- 不增加第三方依赖、数据库或交互状态。

---

### 任务 1：首页结构与展厅视觉

**文件：**

- 修改：`app/page.tsx`
- 修改：`app/site.css`
- 修改：`tests/site-content.test.mjs`

**接口：** 根页继续消费 `siteSections` 和 `EntryCard`；新增展厅封面元素使用语义类名 `gallery-hero`、`gallery-stage`、`gallery-card-grid`。

- [ ] **步骤 1：写失败测试**

```js
const source = fs.readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
assert.match(source, /gallery-hero/);
assert.match(source, /gallery-stage/);
assert.match(source, /siteSections\.map/);
```

- [ ] **步骤 2：确认测试失败**

运行：`node tests/site-content.test.mjs`

预期：现有页面未包含 `gallery-hero` 和 `gallery-stage`。

- [ ] **步骤 3：实现最小重设**

```tsx
<section className="gallery-hero">
  <div className="gallery-stage" aria-hidden="true">...</div>
  <div className="gallery-card-grid">
    {siteSections.map((entry, index) => <EntryCard entry={entry} index={index} key={entry.slug}/>) }
  </div>
</section>
```

CSS 定义深石墨背景、暖白文字、抽象编号/轨道、非等宽卡片和单列移动端断点。

- [ ] **步骤 4：确认测试通过**

运行：`node tests/site-content.test.mjs`

预期：全部通过。

- [ ] **步骤 5：提交**

运行：`git add app/page.tsx app/site.css components/entry-card.tsx tests/site-content.test.mjs`，然后运行：`git commit -m "feat: redesign home as digital gallery"`。

### 任务 2：全站一致性与验收

**文件：**

- 修改：`components/site-shell.tsx`
- 修改：`app/site.css`

**接口：** `SiteShell` 保留导航与页脚，只调整深色展厅的前景、焦点及页面边界；实验室独立客户端页面不受影响。

- [ ] **步骤 1：写失败测试**

```js
const css = fs.readFileSync(new URL('../app/site.css', import.meta.url), 'utf8');
assert.match(css, /prefers-reduced-motion/);
assert.match(css, /gallery-card-grid/);
```

- [ ] **步骤 2：确认测试失败**

运行：`node tests/site-content.test.mjs`

预期：旧样式没有展厅网格选择器。

- [ ] **步骤 3：实施样式收尾**

为导航、页脚、卡片链接和焦点样式统一深色主题；添加移动端网格回退及减弱动画规则。

- [ ] **步骤 4：完整验证**

运行：`node tests/site-content.test.mjs; node tests/circuit.test.mjs; pnpm build`

预期：14 项测试通过，构建成功。

- [ ] **步骤 5：提交**

运行：`git add components/site-shell.tsx app/site.css tests/site-content.test.mjs`，然后运行：`git commit -m "style: refine gallery shell responsiveness"`。

## 计划自检

- 覆盖：任务 1 处理首屏、主视觉与卡片层级；任务 2 处理全站一致性、移动端和验收。
- 无占位：没有未定义的组件、接口或延后实现标记。
- 一致性：卡片始终由 `siteSections.map` 生成，路由与数据注册表保持不变。

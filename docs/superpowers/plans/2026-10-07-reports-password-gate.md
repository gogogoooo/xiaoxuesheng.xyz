# 汇报材料密码门禁 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为作品页增加汇报材料子目录，并以普通客户端密码门禁展示 2026 年国庆基础采集研发部门汇报稿。

**Architecture:** 保持 Next/Vinext 静态导出。作品页和汇报目录使用现有 SiteShell，客户端 `ReportAccessGate` 通过 `sessionStorage` 管理本次会话的解锁状态；汇报正文由站内静态 Markdown 资源加载并转换为安全的基础 HTML 排版，配图放在 `public/reports/2026-national-day/`。

**Tech Stack:** React 19、Next/Vinext App Router、TypeScript、现有 CSS、Node 原生测试。

## Global Constraints

- 密码门禁是普通访问门禁，不提供企业级保密能力。
- 默认密码为 `god1988`，校验值不直接显示在页面文本中。
- 继续使用静态导出，构建输出为 `dist/client`。
- 不修改 DNS、Cloudflare 项目配置或其他栏目功能。
- 不提交 `xiaoxuesheng-pages-upload.zip`。

---

### Task 1: Add regression coverage

**Files:**
- Modify: `tests/site-content.test.mjs`

- [ ] **Step 1: Write failing assertions** for the works entry, report routes, source document, four images, gate component, session storage behavior, and static export params.
- [ ] **Step 2: Run `node tests/site-content.test.mjs`** and confirm the new assertions fail because the report feature is not present.

### Task 2: Add report source assets and content

**Files:**
- Create: `public/reports/2026-national-day/report.md`
- Create: `public/reports/2026-national-day/total-technology-map.png`
- Create: `public/reports/2026-national-day/enta-next.png`
- Create: `public/reports/2026-national-day/skill-studio-ai.png`
- Create: `public/reports/2026-national-day/aigov-insight.png`

- [ ] **Step 1:** Copy the user-provided Markdown and four referenced PNGs into the names above.
- [ ] **Step 2:** Confirm the Markdown and all assets exist and are non-empty.

### Task 3: Implement access gate and report pages

**Files:**
- Create: `components/report-access-gate.tsx`
- Create: `components/report-markdown.tsx`
- Create: `app/works/reports/page.tsx`
- Create: `app/works/reports/2026-national-day/page.tsx`
- Modify: `lib/site-content.ts`
- Modify: `app/works/page.tsx`
- Modify: `app/site.css`

- [ ] **Step 1:** Implement client gate with `sessionStorage`, SHA-256 comparison, Chinese error state, and lock action.
- [ ] **Step 2:** Implement safe Markdown block rendering for headings, paragraphs, bold spans, and image markers.
- [ ] **Step 3:** Add the reports directory card and protected detail route.
- [ ] **Step 4:** Add responsive report typography, cards, image framing, and password form styles.

### Task 4: Verify and commit

- [ ] **Step 1:** Run `node tests/site-content.test.mjs`.
- [ ] **Step 2:** Run `node tests/circuit.test.mjs`.
- [ ] **Step 3:** Run `pnpm build` and confirm all report routes prerender.
- [ ] **Step 4:** Inspect `git diff --stat` and commit with `feat: add protected reports section`.


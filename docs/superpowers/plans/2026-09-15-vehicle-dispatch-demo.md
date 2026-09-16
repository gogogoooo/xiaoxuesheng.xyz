# 车辆调度 Demo 挂载 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在小程序页面展示并打开车辆调度静态 Demo，同时提供体验版二维码。

**Architecture:** 原始 Demo 解压进 `public/demos/vehicle-dispatch/`，保留其相对资源引用；`/apps` 页面只渲染入口卡片和二维码，避免改变 Demo 本身。

**Tech Stack:** Vinext、React、TypeScript、静态资源。

## Global Constraints

中文文案；仅本地验证；不接入真实认证或服务端。

---

### Task 1: 添加静态演示与二维码

**Files:**
- Create: `public/demos/vehicle-dispatch/index.html`
- Create: `public/demos/vehicle-dispatch/app.js`
- Create: `public/demos/vehicle-dispatch/model.js`
- Create: `public/demos/vehicle-dispatch/style.css`
- Create: `public/demos/vehicle-dispatch/refinements.css`
- Create: `public/vehicle-dispatch-experience-qr.png`
- Test: `tests/site-content.test.mjs`

- [ ] **Step 1: 写失败测试**：断言演示入口、二维码文件和体验提示存在。
- [ ] **Step 2: 运行测试**：确认新断言因资源和入口不存在而失败。
- [ ] **Step 3: 解压原始 Demo 并复制二维码。**
- [ ] **Step 4: 再次运行测试**：确认资源检查通过。

### Task 2: 添加小程序页作品卡

**Files:**
- Modify: `app/apps/page.tsx`
- Modify: `app/site.css`
- Test: `tests/site-content.test.mjs`

- [ ] **Step 1: 写失败测试**：断言页面包含 Demo 地址、二维码地址和体验版文案。
- [ ] **Step 2: 运行测试**：确认页面断言失败。
- [ ] **Step 3: 实现作品卡及移动端布局。**
- [ ] **Step 4: 运行全部站点测试和生产构建。**

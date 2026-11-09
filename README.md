# zgqmoe.github.io

TOMOchan 的个人小站，基于 [Astro](https://astro.build) 构建，推送到 `main` 后由 GitHub Actions 自动部署到 GitHub Pages。

## 写文章

在 `src/content/posts/` 下新建一个 `.md` 文件，文件名就是网址（例如 `rlc-transient.md` 对应 `/posts/rlc-transient/`）。可以建子文件夹来分类整理。

```md
---
title: 标题
date: 2026-11-09
category: learn       # learn 学习拾遗 · analysis 分析 · essay 杂文
tags: [EEE, 电路]
description: 一句话摘要（可选）
draft: false          # true 时只在本地显示
---

正文，支持 Markdown 和 LaTeX：$V = IR$，

$$
\nabla \cdot \mathbf{D} = \rho_v
$$
```

文章里用到的图片放在 `public/images/` 下，正文中写 `![](/images/xxx.png)` 引用。

## 专业笔记

专业笔记不写在这个仓库里，而是来自各课程的笔记仓库（列表在 `src/data/courses.mjs`）。每次构建前 `scripts/sync-notes.mjs` 会把它们浅克隆下来并转换：`` ```math `` 转成公式、`.md` 之间的相对链接转成站内链接、图片复制到 `public/notes-assets/`。章节顺序跟各仓库 README 里列出的链接顺序一致。

**自动更新**：`.github/workflows/deploy.yml` 每 30 分钟用 `scripts/notes-changed.mjs` 比较各笔记仓库的最新提交和线上 `/notes-version.json`，有变化才重新构建。所以往笔记仓库推送后，一般半小时内网站就会更新（GitHub 的定时任务偶尔会晚几分钟）。想立刻更新：在本仓库 Actions 页面手动运行 "Deploy to GitHub Pages"。

**笔记即时更新（可选）**：如果想推送后一两分钟就更新，可以让笔记仓库在推送时通知本站。需要一个只对本仓库有 Contents 读写权限的 fine-grained token，存成笔记仓库的 secret `SITE_DISPATCH_TOKEN`，再在笔记仓库加一个 workflow：

```yaml
on: { push: { branches: [main] } }
jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - run: >
          curl -sf -X POST -H "Authorization: Bearer ${{ secrets.SITE_DISPATCH_TOKEN }}"
          -H "Accept: application/vnd.github+json"
          https://api.github.com/repos/ZGQmoe/ZGQmoe.github.io/dispatches
          -d '{"event_type":"notes-updated"}'
```

加一门课：在 `src/data/courses.mjs` 里加一项。

## 首页版式

`/` 是版式 A（纵向）。另外两个备选在 `/lab/bento/`（Bento 网格）和 `/lab/index-card/`（居中名片 + 目录），定下来之后把对应文件内容换进 `src/pages/index.astro` 即可。

## 改其他内容

| 想改的 | 文件 |
|---|---|
| 名字、简介、导航、社交图标 | `src/config.ts` |
| 项目卡片（含在线地址 live） | `src/data/projects.ts` |
| 课程列表 | `src/data/courses.mjs` |
| 友链 | `src/data/friends.ts` |
| 关于页 | `src/pages/about.astro` |
| 鲨鱼配色 | `src/lib/ocean/renderer.ts` 里的 `THEME_DARK` / `THEME_LIGHT` |

## 本地预览

```bash
npm install
npm run dev     # http://localhost:4321
```

## 致谢

首页的 ASCII 鲨鱼改自 [stackedlol/ascii-sharks](https://github.com/stackedlol/ascii-sharks)（MIT），修改内容见 `src/lib/ocean/NOTICE.md`。

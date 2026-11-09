# zgqmoe.github.io

TOMOchan 的个人小站，基于 [Astro](https://astro.build) 构建，推送到 `main` 后由 GitHub Actions 自动部署到 GitHub Pages。

## 写文章

在 `src/content/posts/` 下新建一个 `.md` 文件，文件名就是网址（例如 `rlc-transient.md` 对应 `/posts/rlc-transient/`）。可以建子文件夹来分类整理。

```md
---
title: 标题
date: 2026-11-09
category: course      # course 专业笔记 · learn 学习拾遗 · analysis 分析 · essay 杂文
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

## 改其他内容

| 想改的 | 文件 |
|---|---|
| 名字、简介、导航、社交图标 | `src/config.ts` |
| 项目卡片 | `src/data/projects.ts` |
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

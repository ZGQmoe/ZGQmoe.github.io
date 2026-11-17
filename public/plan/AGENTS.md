# 期末倒排计划（/plan/）

线上页面：https://zgqmoe.github.io/plan/ 。纯静态，不经过 Astro 构建，`public/plan/` 原样发布。

| 文件 | 内容 | 谁改 |
|---|---|---|
| `plan.json` | 日期、课程、学习单元、实验与报告截止、假期刷题、打印清单 | 计划有变时改 |
| `progress.json` | 完成状态、复习记录、块数调整、每日容量 | 用户确认完成后改 |
| `core.js` | 排程算法，页面和校验脚本共用 | 一般不动 |
| `index.html` | 页面 | 一般不动 |
| `check.mjs` | 校验 + 打印排程 | — |

## 改完必须做

```sh
node public/plan/check.mjs            # 校验，打印今天起 5 天
node public/plan/check.mjs 2026-11-20 7
```

不通过就不要提交。提交后推送到 `main`，GitHub Pages 自动部署，一两分钟后生效。

## 标记完成（progress.json）

- 只记用户明确说「做完了 / 学完了」的内容。讨论过、看过答案、你推测的都不算。
- `done`：`"单元id": "完成日期"`。日期写用户实际完成的那天，不是今天。
- `rev`：短复习，键是 `单元id@1`、`@3`、`@7`（D+1/D+3/D+7），值是复习日期。
- `dl`：实验/报告，键是 `plan.json` 里 deadlines 的 `id`，值是完成日期。
- `part`：部分完成的块数；`pull`：用户要提前做的单元，值是开始日期。
- `hol`：假期勾选，键是 `日期#序号`。
- 每次改都把 `updated` 写成今天。
- 用户贴来页面「复制给 Codex」的整段 JSON 时，整个替换 `progress.json`，再跑校验。

## 改计划（plan.json）

- 单元字段：`id`（不可改、不可复用）、`course`、`title`、`blocks`（50 分钟一块）、`due`（目标完成日）、`source`（讲义章节和页码）、`standard`（完成标准，可检验的动作）；可选 `from`（最早开始日）、`kind`（`learn` 默认，进 D+1/3/7 复习；`test` 闭卷诊断；`cw` coursework，不进复习）、`fixed`（硬截止说明）。
- 新单元用新 id，按课程前缀续号（SNS `s`、MCE `m`、EM `e`、MGT `g`、ESP `p`）。删单元前先把 `progress.json` 里引用它的键一起删掉。
- 截止项 `id` 一旦被 `progress.dl` 引用就不要改。
- 讲义内容都按要考处理；页码、日期以讲义和 Canvas 为准，不确定的写「待核对」，不要编。
- 用户学得比计划快：把已学的标 `done`；后续单元要提前的用 `pull`，不要改 `due`。

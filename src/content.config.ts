import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// 自己写的文章：学习拾遗 / 分析 / 杂文
const posts = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/posts" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    // learn 学习拾遗 · analysis 分析 · essay 杂文 · esp ESP 踩坑分享（连载）
    category: z.enum(["learn", "analysis", "essay", "esp"]),
    tags: z.array(z.string()).default([]),
    description: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

// 专业笔记：构建前由 scripts/sync-notes.mjs 从各课程仓库同步到 .notes/
const notes = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./.notes" }),
  schema: z.object({
    title: z.string(),
    course: z.string(),
    index: z.boolean().default(false),
    // 单元 = 一章 / 一个主题；单元内分标签页（笔记 / 例题）
    unit: z.string(),
    unitTitle: z.string(),
    unitOrder: z.number(),
    tab: z.string(),
    tabLabel: z.string(),
    tabOrder: z.number(),
    source: z.string().url(),
  }),
});

export const collections = { posts, notes };

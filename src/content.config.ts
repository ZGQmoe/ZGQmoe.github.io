import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// 自己写的文章：学习拾遗 / 分析 / 杂文
const posts = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/posts" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    // learn 学习拾遗 · analysis 分析 · essay 杂文
    category: z.enum(["learn", "analysis", "essay"]),
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
    order: z.number(),
    group: z.string().default(""),
    index: z.boolean().default(false),
    source: z.string().url(),
  }),
});

export const collections = { posts, notes };

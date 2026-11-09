import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const posts = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/posts" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    // course 专业笔记 · learn 学习拾遗 · analysis 分析 · essay 杂文
    category: z.enum(["course", "learn", "analysis", "essay"]),
    tags: z.array(z.string()).default([]),
    description: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { posts };

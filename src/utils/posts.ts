import { getCollection, type CollectionEntry } from "astro:content";
import type { Category } from "../config";

export type Post = CollectionEntry<"posts">;

/** 所有已发布文章，新的在前。开发模式下也显示草稿。 */
export async function getPosts(filter?: (p: Post) => boolean) {
  const all = await getCollection("posts", (p) => import.meta.env.DEV || !p.data.draft);
  return all
    .filter((p) => (filter ? filter(p) : true))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export const byCategory = (...cats: Category[]) => (p: Post) => cats.includes(p.data.category);

export function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function tagSlug(tag: string) {
  return encodeURIComponent(tag.trim().toLowerCase().replace(/\s+/g, "-"));
}

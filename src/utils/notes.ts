import { getCollection, type CollectionEntry } from "astro:content";
import { COURSES } from "../data/courses.mjs";

export type Note = CollectionEntry<"notes">;
export type Course = (typeof COURSES)[number] & { extras?: { label: string; href: string }[] };

export async function getCourseNotes(slug: string) {
  const all = await getCollection("notes", (n) => n.data.course === slug);
  return all.sort((a, b) => a.data.order - b.data.order);
}

/** 正文页（去掉课程首页用的 README） */
export const docsOf = (notes: Note[]) => notes.filter((n) => !n.data.index);

/** 按子目录分组，保持原有顺序 */
export function groupNotes(notes: Note[]) {
  const groups: { name: string; items: Note[] }[] = [];
  for (const n of docsOf(notes)) {
    const g = groups.find((x) => x.name === n.data.group);
    if (g) g.items.push(n);
    else groups.push({ name: n.data.group, items: [n] });
  }
  return groups;
}

export const courseBySlug = (slug: string) => COURSES.find((c) => c.slug === slug) as Course | undefined;
export const ALL_COURSES = COURSES as Course[];

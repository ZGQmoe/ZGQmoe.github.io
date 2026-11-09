import { getCollection, type CollectionEntry } from "astro:content";
import { COURSES } from "../data/courses.mjs";

export type Note = CollectionEntry<"notes">;
export type Course = (typeof COURSES)[number] & { extras?: { label: string; href: string }[] };
export type Unit = { key: string; title: string; order: number; tabs: Note[] };

export async function getCourseNotes(slug: string) {
  return getCollection("notes", (n) => n.data.course === slug);
}

/** 按单元归组，单元内按标签顺序 */
export function unitsOf(notes: Note[]): Unit[] {
  const map = new Map<string, Unit>();
  for (const n of notes) {
    if (n.data.index) continue;
    const u = map.get(n.data.unit) ?? { key: n.data.unit, title: n.data.unitTitle, order: n.data.unitOrder, tabs: [] };
    u.tabs.push(n);
    map.set(n.data.unit, u);
  }
  const units = [...map.values()].sort((a, b) => a.order - b.order);
  units.forEach((u) => u.tabs.sort((a, b) => a.data.tabOrder - b.data.tabOrder));
  return units;
}

/** 「Chapter 2 — Continuous-Time Signals」拆成「Chapter 2」和副标题 */
export function splitTitle(t: string) {
  const m = t.match(/^(Chapter\s+\d+)\s*[—–:-]\s*(.+)$/i);
  return m ? { head: m[1], sub: m[2] } : { head: t, sub: "" };
}

export const courseBySlug = (slug: string) => COURSES.find((c) => c.slug === slug) as Course | undefined;
export const ALL_COURSES = COURSES as Course[];

import { getPosts } from "./posts";
import { ALL_COURSES, getCourseNotes, unitsOf } from "./notes";
import { PROJECTS } from "../data/projects";
import { FRIEND_GROUPS } from "../data/friends";
import { SITE } from "../config";

/** 首页各版式共用的数据 */
export async function homeData() {
  const posts = await getPosts();
  const courses = await Promise.all(
    ALL_COURSES.map(async (c) => ({ ...c, count: unitsOf(await getCourseNotes(c.slug)).length })),
  );
  const noteCount = courses.reduce((n, c) => n + c.count, 0);
  const friends = FRIEND_GROUPS.reduce((n, g) => n + g.friends.length, 0);
  const days = Math.max(1, Math.floor((Date.now() - new Date(SITE.since).getTime()) / 86400000) + 1);
  return {
    posts,
    recent: posts.slice(0, 5),
    courses,
    projects: PROJECTS.filter((p) => p.status === "active"),
    stats: { posts: posts.length, notes: noteCount, courses: courses.length, friends, days },
  };
}

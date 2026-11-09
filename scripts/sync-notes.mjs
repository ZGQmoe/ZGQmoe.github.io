#!/usr/bin/env node
// 把各课程笔记仓库拉到 .notes/<slug>/，并把 GitHub 风格的 Markdown 转成网站能直接渲染的格式：
//   - ```math 代码块  → $$ … $$（KaTeX）
//   - 指向 .md 的相对链接 → 网站路由 /notes/<slug>/<path>/
//   - 首个 # 标题 → frontmatter.title（正文里去掉，页面自己渲染标题）
//   - 补上 course / order / group / slug，供内容集合排序分组
// 图片等其他文件原样复制，Markdown 里的相对图片路径保持有效。
//
// 用法：node scripts/sync-notes.mjs            （从 GitHub 浅克隆）
//      NOTES_SRC=/path/to/clones node scripts/sync-notes.mjs   （用本地已有的克隆，目录名为仓库名小写）

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { COURSES, EXCLUDE } from "../src/data/courses.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT = path.join(ROOT, ".notes");
// 图片等静态文件放到 public/ 下，Markdown 和 HTML 里的相对路径都改写成绝对路径
const ASSETS = path.join(ROOT, "public", "notes-assets");
const TMP = path.join(ROOT, ".notes-src");
const LOCAL = process.env.NOTES_SRC;

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.rmSync(ASSETS, { recursive: true, force: true });
fs.mkdirSync(ASSETS, { recursive: true });

const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

function fetchRepo(repo) {
  const name = repo.split("/")[1].toLowerCase();
  if (LOCAL) {
    const dir = path.join(LOCAL, name);
    if (fs.existsSync(dir)) return dir;
  }
  const dir = path.join(TMP, name);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(TMP, { recursive: true });
  execFileSync("git", ["clone", "--quiet", "--depth", "1", `https://github.com/${repo}.git`, dir], { stdio: "inherit" });
  return dir;
}

function walk(dir, base = dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name.startsWith(".")) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p, base));
    else out.push(path.relative(base, p).split(path.sep).join("/"));
  }
  return out;
}

const docSlug = (course, rel) =>
  `${course.slug}/${rel
    .replace(/\.md$/i, "")
    .replace(/(^|\/)README$/i, "$1index")
    .toLowerCase()}`;

const humanize = (s) => s.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function transform(md, course, rel) {
  let body = md.replace(/\r\n/g, "\n");

  // 去掉已有 frontmatter（这些仓库一般没有）
  body = body.replace(/^---\n[\s\S]*?\n---\n/, "");

  // ```math → $$
  body = body.replace(/^```math[ \t]*\n([\s\S]*?)\n```[ \t]*$/gm, (_, m) => `$$\n${m.trim()}\n$$`);

  // 相对 .md 链接 → 站内路由（跳过代码块里的内容不值得复杂处理，笔记里很少出现）
  const dir = path.posix.dirname(rel);
  body = body.replace(/\]\((?!https?:|mailto:|#)([^)\s]+?\.md)(#[^)\s]*)?\)/gi, (all, target, hash = "") => {
    const resolved = path.posix.normalize(path.posix.join(dir, decodeURIComponent(target)));
    if (resolved.startsWith("..")) return all;
    return `](/notes/${docSlug(course, resolved)}/${hash})`;
  });

  // 其他相对路径（图片、交互页）→ /notes-assets/<slug>/…
  const asset = (target) => {
    if (/^(https?:|mailto:|#|\/|data:)/i.test(target)) return null;
    const [p, hash = ""] = target.split("#");
    const resolved = path.posix.normalize(path.posix.join(dir, decodeURIComponent(p)));
    if (resolved.startsWith("..")) return null;
    return `/notes-assets/${course.slug}/${resolved}${hash ? "#" + hash : ""}`;
  };
  body = body.replace(/(\]\()([^)\s]+)((?:\s+"[^"]*")?\))/g, (all, a, target, b) => {
    const r = asset(target);
    return r ? a + r + b : all;
  });
  body = body.replace(/(<(?:img|a|source|iframe)\b[^>]*?\s(?:src|href)=")([^"]+)(")/gi, (all, a, target, b) => {
    const r = asset(target);
    return r ? a + r + b : all;
  });

  // 标题
  let title = "";
  // 只取第一个一级标题（非全局匹配）
  body = body.replace(/^#[ \t]+(.+?)[ \t]*#*[ \t]*$/m, (_, t) => {
    title = t.replace(/\*\*/g, "").trim();
    return "";
  });
  if (!title) title = humanize(path.posix.basename(rel, ".md"));

  return { title, body: body.replace(/^\n+/, "") };
}

const yaml = (v) => JSON.stringify(v);
const manifest = [];

for (const course of COURSES) {
  const src = fetchRepo(course.repo);
  const files = walk(src);
  const docs = files
    .filter((f) => /\.md$/i.test(f) && !EXCLUDE.includes(path.posix.basename(f)))
    .sort((a, b) => {
      // README 放最前；其余按目录、再按文件名自然排序
      const ra = /(^|\/)README\.md$/i.test(a) ? 0 : 1;
      const rb = /(^|\/)README\.md$/i.test(b) ? 0 : 1;
      return ra - rb || collator.compare(a, b);
    });

  // README 里按顺序列出的链接决定章节顺序（没列出的按文件名排在后面）
  const readme = files.find((f) => /^README\.md$/i.test(f));
  if (readme) {
    const listed = [...fs.readFileSync(path.join(src, readme), "utf8").matchAll(/\]\(\.?\/?([^)#\s]+\.md)/gi)].map((m) =>
      path.posix.normalize(decodeURIComponent(m[1])),
    );
    const rank = (f) => (/^README\.md$/i.test(f) ? -1 : listed.includes(f) ? listed.indexOf(f) : 1e4);
    docs.sort((a, b) => rank(a) - rank(b) || collator.compare(a, b));
  }

  // 非 Markdown 文件（图片、交互页等）原样复制到 public/notes-assets
  for (const f of files) {
    if (/\.md$/i.test(f)) continue;
    const to = path.join(ASSETS, course.slug, f);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(path.join(src, f), to);
  }

  docs.forEach((rel, order) => {
    const raw = fs.readFileSync(path.join(src, rel), "utf8");
    const { title, body } = transform(raw, course, rel);
    const isIndex = /(^|\/)README\.md$/i.test(rel) && !rel.includes("/");
    const group = rel.includes("/") ? humanize(rel.split("/")[0]) : "";
    const fm = [
      "---",
      `title: ${yaml(title)}`,
      `course: ${yaml(course.slug)}`,
      `slug: ${yaml(docSlug(course, rel))}`,
      `order: ${order}`,
      `group: ${yaml(group)}`,
      `index: ${isIndex}`,
      `source: ${yaml(`https://github.com/${course.repo}/blob/HEAD/${rel}`)}`,
      "---",
      "",
    ].join("\n");
    const to = path.join(OUT, course.slug, rel);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.writeFileSync(to, fm + body);
  });

  manifest.push(`${course.code}: ${docs.length} docs`);
}

fs.rmSync(TMP, { recursive: true, force: true });
console.log(`[sync-notes] ${manifest.join(" · ")}`);

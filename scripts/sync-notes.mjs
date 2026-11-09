#!/usr/bin/env node
// 把各课程笔记仓库拉到 .notes/<slug>/，并把 GitHub 风格的 Markdown 转成网站能直接渲染的格式。
//
// 组织方式：同一章（chapter-N-*.md）或同一个子目录里的文件合成一个「单元」，
// 单元里按「笔记 / 例题」分标签页：
//   /notes/<课程>/<单元>/           第一篇笔记
//   /notes/<课程>/<单元>/problems/  例题（文件名含 problem / example / exercise）
//
// 转换：
//   - ```math 代码块 → $$ … $$（KaTeX）
//   - 指向 .md 的相对链接 → 对应单元 / 标签页的站内地址
//   - 独占一行、指向仓库里交互页（.html）的链接 → 页面内嵌的交互图
//   - <img>/![]() 引用的 SVG → 直接内联（currentColor 跟随深浅色；matplotlib 的黑白也换成 currentColor）
//   - 其他相对路径（PNG、HTML 等）→ /notes-assets/<课程>/…
//   - 首个 # 标题 → frontmatter.title
//
// 用法：node scripts/sync-notes.mjs
//      NOTES_SRC=/path/to/clones node scripts/sync-notes.mjs   （用本地已有克隆，目录名为仓库名小写）

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { COURSES, EXCLUDE } from "../src/data/courses.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT = path.join(ROOT, ".notes");
const TMP = path.join(ROOT, ".notes-src");
const ASSETS = path.join(ROOT, "public", "notes-assets");
const LOCAL = process.env.NOTES_SRC;

for (const d of [OUT, ASSETS]) {
  fs.rmSync(d, { recursive: true, force: true });
  fs.mkdirSync(d, { recursive: true });
}

const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });
const posix = path.posix;

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

const humanize = (s) => s.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const firstH1 = (md) => md.match(/^#[ \t]+(.+?)[ \t]*#*[ \t]*$/m)?.[1].replace(/\*\*/g, "").trim();
const isReadme = (f) => /(^|\/)README\.md$/i.test(f);
const isProblems = (f) => /problem|example|exercise|question/i.test(posix.basename(f));

/** 单元键：chapter-N / 子目录名 / 文件名 */
function unitKey(rel) {
  if (rel.includes("/")) return rel.split("/")[0].toLowerCase();
  const m = posix.basename(rel).match(/^chapter[-_ ]?(\d+)/i);
  return m ? `chapter-${m[1]}` : posix.basename(rel, ".md").toLowerCase();
}

// ── SVG 内联 ────────────────────────────────────────────────
let svgCounter = 0;
function inlineSvg(file, alt) {
  let svg = fs.readFileSync(file, "utf8");
  svg = svg.replace(/<\?xml[^>]*>\s*/g, "").replace(/<!DOCTYPE[^>]*>\s*/gi, "").replace(/<metadata>[\s\S]*?<\/metadata>\s*/g, "");
  // id 加前缀，避免同页多张图互相冲突
  const p = `s${++svgCounter}-`;
  svg = svg
    .replace(/\bid="([^"]+)"/g, `id="${p}$1"`)
    .replace(/url\(#([^)]+)\)/g, `url(#${p}$1)`)
    .replace(/(xlink:href|href)="#([^"]+)"/g, `$1="#${p}$2"`);
  // matplotlib 等硬编码颜色：近黑 / 深灰 → currentColor（跟随正文颜色）；
  // 纯白底板 → 去掉；很浅的底色 → 半透明的 currentColor。彩色线条保持原样。
  const recolor = (prop, hex) => {
    let h = hex.toLowerCase();
    if (h.length === 3) h = [...h].map((c) => c + c).join("");
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const grey = max - min < 40;
    if (grey && lum < 120) return { css: `${prop}: currentColor`, attr: `${prop}="currentColor"` };
    if (prop === "fill" && lum > 250) return { css: "fill: none", attr: 'fill="none"' };
    if (prop === "fill" && lum > 225)
      return { css: "fill: currentColor; fill-opacity: 0.07", attr: 'fill="currentColor" fill-opacity="0.07"' };
    return null;
  };
  svg = svg
    .replace(/(fill|stroke):\s*#([0-9a-f]{6}|[0-9a-f]{3})\b/gi, (m, prop, hex) => recolor(prop, hex)?.css ?? m)
    .replace(/(fill|stroke)="#([0-9a-f]{6}|[0-9a-f]{3})"/gi, (m, prop, hex) => recolor(prop, hex)?.attr ?? m);
  // 没写颜色的元素（matplotlib 的文字）默认是黑色：让根节点的 fill 继承 currentColor
  svg = svg.replace(/<svg\b/, '<svg fill="currentColor"');
  // 去掉固定宽高，按容器缩放
  svg = svg.replace(/<svg\b([^>]*)>/, (m, attrs) => {
    const a = attrs.replace(/\s(width|height)="[^"]*"/g, "");
    return `<svg${a} role="img"${alt ? ` aria-label="${alt.replace(/"/g, "&quot;")}"` : ""}>`;
  });
  // HTML 块遇到空行就会结束，所以把 SVG 压成没有空行的一段
  svg = svg.replace(/\n\s*\n/g, "\n").trim();
  return `\n\n<figure class="nfig" data-zoom>${svg}${alt ? `<figcaption>${alt}</figcaption>` : ""}</figure>\n\n`;
}

// ── 主流程 ──────────────────────────────────────────────────
const summary = [];
// 记录本次用到的每个笔记仓库的提交，部署后在 /notes-version.json 里，
// 定时任务拿它和仓库最新提交比较，没变就不重新构建。
const versions = {};

for (const course of COURSES) {
  const src = fetchRepo(course.repo);
  try {
    versions[course.repo] = execFileSync("git", ["-C", src, "rev-parse", "HEAD"]).toString().trim();
  } catch {
    versions[course.repo] = "unknown";
  }
  const files = walk(src);
  const pagesBase = `https://${course.repo.split("/")[0].toLowerCase()}.github.io/${course.repo.split("/")[1]}/`;

  // 非 Markdown 文件原样复制到 public/notes-assets
  for (const f of files) {
    if (/\.md$/i.test(f)) continue;
    const to = path.join(ASSETS, course.slug, f);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(path.join(src, f), to);
  }

  let docs = files.filter((f) => /\.md$/i.test(f) && !EXCLUDE.includes(posix.basename(f)));
  const readme = docs.find((f) => isReadme(f) && !f.includes("/"));
  docs = docs.filter((f) => f !== readme);

  // README 里列出的链接顺序优先，其余按自然顺序
  const listed = readme
    ? [...fs.readFileSync(path.join(src, readme), "utf8").matchAll(/\]\(\.?\/?([^)#\s]+\.md)/gi)].map((m) =>
        posix.normalize(decodeURIComponent(m[1])),
      )
    : [];
  const rank = (f) => (listed.includes(f) ? listed.indexOf(f) : 1e4);
  docs.sort((a, b) => rank(a) - rank(b) || collator.compare(a, b));

  // 第一遍：分单元、定标签和地址
  const units = new Map();
  docs.forEach((rel, i) => {
    const key = unitKey(rel);
    if (!units.has(key)) units.set(key, { key, order: units.size, docs: [] });
    units.get(key).docs.push({ rel, i, problems: isProblems(rel), raw: fs.readFileSync(path.join(src, rel), "utf8") });
  });
  const route = new Map(); // rel → 站内路径（不含 /notes/ 前缀）
  for (const u of units.values()) {
    u.docs.sort((a, b) => Number(a.problems) - Number(b.problems) || a.i - b.i);
    const notesDocs = u.docs.filter((d) => !d.problems);
    const probDocs = u.docs.filter((d) => d.problems);
    u.docs.forEach((d, t) => {
      d.title = firstH1(d.raw) || humanize(posix.basename(d.rel, ".md"));
      if (t === 0) d.tab = "";
      else if (d.problems) d.tab = probDocs.length > 1 ? `problems-${probDocs.indexOf(d) + 1}` : "problems";
      else d.tab = posix.basename(d.rel, ".md").toLowerCase().replace(/[^a-z0-9]+/g, "-");
      d.tabLabel = d.problems
        ? probDocs.length > 1
          ? d.title
          : "例题"
        : notesDocs.length > 1
          ? d.title
          : "笔记";
      d.tabOrder = t;
      route.set(d.rel, `${course.slug}/${u.key}${d.tab ? "/" + d.tab : ""}`);
    });
    const lead = notesDocs[0] ?? u.docs[0];
    u.title = lead.title;
    // 子目录单元：标题用目录名更稳（比如 concept.md 的标题可能很长）
    if (lead.rel.includes("/") && !firstH1(lead.raw)) u.title = humanize(u.key);
  }
  if (readme) route.set(readme, course.slug);

  // 第二遍：转换正文
  const transform = (md, rel) => {
    const dir = posix.dirname(rel);
    let body = md.replace(/\r\n/g, "\n").replace(/^---\n[\s\S]*?\n---\n/, "");

    body = body.replace(/^```math[ \t]*\n([\s\S]*?)\n```[ \t]*$/gm, (_, m) => `$$\n${m.trim()}\n$$`);

    // .md 链接
    body = body.replace(/\]\((?!https?:|mailto:|#)([^)\s]+?\.md)(#[^)\s]*)?\)/gi, (all, target, hash = "") => {
      const r = route.get(posix.normalize(posix.join(dir, decodeURIComponent(target))));
      return r ? `](/notes/${r === course.slug ? r : r}/${hash})` : all;
    });

    // 交互页：独占一行的链接 → 内嵌
    const toLocal = (target) => {
      let p = target;
      if (p.startsWith(pagesBase)) p = p.slice(pagesBase.length);
      else if (/^(https?:|mailto:|#|\/|data:)/i.test(p)) return null;
      else p = posix.normalize(posix.join(dir, p));
      const [file, hash = ""] = p.split("#");
      const resolved = decodeURIComponent(file);
      if (resolved.startsWith("..") || !files.includes(resolved)) return null;
      return { resolved, hash };
    };
    body = body.replace(/^\[([^\]]+)\]\(([^)\s]+\.html(?:#[^)\s]*)?)\)[ \t]*$/gim, (all, text, target) => {
      const l = toLocal(target);
      if (!l) return all;
      return `\n<div class="lab-embed" data-src="/notes-assets/${course.slug}/${l.resolved}" data-hash="${l.hash}" data-title="${text.replace(/"/g, "&quot;")}"></div>`;
    });

    // SVG 内联：<img src="x.svg" alt="…"> 和 ![alt](x.svg)
    body = body.replace(/<img\b([^>]*?)\bsrc="([^"]+\.svg)"([^>]*)>/gi, (all, a, target, b) => {
      const l = toLocal(target);
      if (!l) return all;
      const alt = (a + b).match(/\balt="([^"]*)"/)?.[1] ?? "";
      return inlineSvg(path.join(src, l.resolved), alt);
    });
    body = body.replace(/^!\[([^\]]*)\]\(([^)\s]+\.svg)\)[ \t]*$/gim, (all, alt, target) => {
      const l = toLocal(target);
      return l ? inlineSvg(path.join(src, l.resolved), alt) : all;
    });

    // 其他相对路径 → /notes-assets/
    const asset = (target) => {
      const l = toLocal(target);
      return l ? `/notes-assets/${course.slug}/${l.resolved}${l.hash ? "#" + l.hash : ""}` : null;
    };
    body = body.replace(/(\]\()([^)\s]+)((?:\s+"[^"]*")?\))/g, (all, a, target, b) => {
      const r = asset(target);
      return r ? a + r + b : all;
    });
    body = body.replace(/(<(?:img|a|source|iframe)\b[^>]*?\s(?:src|href)=")([^"]+)(")/gi, (all, a, target, b) => {
      const r = asset(target);
      return r ? a + r + b : all;
    });

    // 去掉第一个一级标题（页面自己渲染）
    body = body.replace(/^#[ \t]+.+$/m, "");
    return body.replace(/^\n+/, "");
  };

  const yaml = (v) => JSON.stringify(v);
  const write = (rel, fm, body) => {
    const to = path.join(OUT, course.slug, rel);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    const head = ["---", ...Object.entries(fm).map(([k, v]) => `${k}: ${yaml(v)}`), "---", ""].join("\n");
    fs.writeFileSync(to, head + body);
  };

  if (readme) {
    const raw = fs.readFileSync(path.join(src, readme), "utf8");
    write(readme, {
      title: firstH1(raw) || course.code,
      course: course.slug,
      slug: course.slug,
      index: true,
      unit: "",
      unitTitle: "",
      unitOrder: -1,
      tab: "",
      tabLabel: "",
      tabOrder: 0,
      source: `https://github.com/${course.repo}/blob/HEAD/${readme}`,
    }, transform(raw, readme));
  }
  for (const u of units.values()) {
    for (const d of u.docs) {
      write(d.rel, {
        title: d.title,
        course: course.slug,
        slug: route.get(d.rel),
        index: false,
        unit: u.key,
        unitTitle: u.title,
        unitOrder: u.order,
        tab: d.tab,
        tabLabel: d.tabLabel,
        tabOrder: d.tabOrder,
        source: `https://github.com/${course.repo}/blob/HEAD/${d.rel}`,
      }, transform(d.raw, d.rel));
    }
  }

  summary.push(`${course.code}: ${units.size} units / ${docs.length} docs`);
}

fs.writeFileSync(path.join(ROOT, "public", "notes-version.json"), JSON.stringify(versions, null, 2) + "\n");
fs.rmSync(TMP, { recursive: true, force: true });
console.log(`[sync-notes] ${summary.join(" · ")}`);

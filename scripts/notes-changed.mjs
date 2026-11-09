#!/usr/bin/env node
// 定时任务用：比较线上 /notes-version.json 和各笔记仓库的最新提交。
// 有变化（或线上没有记录）时输出 changed=true，写进 $GITHUB_OUTPUT。
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { COURSES } from "../src/data/courses.mjs";

const SITE = process.env.SITE_URL ?? "https://zgqmoe.github.io";
let deployed = {};
try {
  const res = await fetch(`${SITE}/notes-version.json`, { cache: "no-store" });
  if (res.ok) deployed = await res.json();
} catch {}

const changed = [];
for (const c of COURSES) {
  const head = execFileSync("git", ["ls-remote", `https://github.com/${c.repo}.git`, "HEAD"]).toString().split(/\s/)[0];
  if (deployed[c.repo] !== head) changed.push(`${c.code} ${deployed[c.repo]?.slice(0, 7) ?? "none"} → ${head.slice(0, 7)}`);
}

console.log(changed.length ? `笔记有更新：\n${changed.join("\n")}` : "笔记没有变化，跳过构建。");
if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changed.length > 0}\n`);

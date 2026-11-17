// 校验 plan.json / progress.json，并打印某天起的排程。
// 用法：node public/plan/check.mjs [YYYY-MM-DD] [天数]
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPlan, normState, schedule, dueReviews, WD, wd, md, remOf } from './core.js';

const here = dirname(fileURLToPath(import.meta.url));
const errs = [];
const read = f => { try { return JSON.parse(readFileSync(join(here, f), 'utf8')); } catch (e) { console.error(`✗ ${f} 不是合法 JSON：${e.message}`); process.exit(1); } };
const raw = read('plan.json'), prog = read('progress.json');
const isDate = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));

const P = loadPlan(raw);
Object.entries(raw.dates).forEach(([k, v]) => { if (!isDate(v)) errs.push(`dates.${k} 不是日期：${v}`); });
const ids = new Set();
P.units.forEach(u => {
  if (ids.has(u.id)) errs.push(`单元 id 重复：${u.id}`); ids.add(u.id);
  if (!P.courses[u.course]) errs.push(`${u.id}: 课程 ${u.course} 不在 courses 里`);
  if (!u.title || !u.source || !u.standard) errs.push(`${u.id}: 缺 title / source / standard`);
  if (!Number.isInteger(u.blocks) || u.blocks < 1) errs.push(`${u.id}: blocks 要是 ≥1 的整数`);
  if (!isDate(u.due) || !isDate(u.from)) errs.push(`${u.id}: due / from 不是日期`);
  if (!['learn', 'test', 'cw'].includes(u.kind)) errs.push(`${u.id}: kind 只能是 learn / test / cw`);
});
const dids = new Set();
raw.deadlines.forEach(d => {
  if (dids.has(d.id)) errs.push(`截止 id 重复：${d.id}`); dids.add(d.id);
  if (!isDate(d.date)) errs.push(`${d.id}: date 不是日期`);
  if (!['lab', 'report', 'info'].includes(d.kind)) errs.push(`${d.id}: kind 只能是 lab / report / info`);
});
raw.holiday.forEach(h => { if (!isDate(h.date)) errs.push(`假期 ${h.date} 不是日期`); });

const st = normState(P, prog);
if (!isDate(prog.updated)) errs.push('progress.updated 要写成 YYYY-MM-DD');
['done', 'pull'].forEach(k => Object.entries(st[k]).forEach(([id, d]) => { if (!P.byId[id]) errs.push(`progress.${k}: 没有单元 ${id}`); if (!isDate(d)) errs.push(`progress.${k}.${id}: 不是日期`); }));
['part', 'adj'].forEach(k => Object.entries(st[k]).forEach(([id, n]) => { if (!P.byId[id]) errs.push(`progress.${k}: 没有单元 ${id}`); if (!Number.isInteger(n)) errs.push(`progress.${k}.${id}: 要是整数`); }));
Object.keys(st.failed).forEach(id => { if (!P.byId[id]) errs.push(`progress.failed: 没有单元 ${id}`); });
Object.entries(st.dl).forEach(([id, d]) => { if (!P.dlById[id]) errs.push(`progress.dl: 没有截止项 ${id}`); if (!isDate(d)) errs.push(`progress.dl.${id}: 不是日期`); });
Object.keys(st.rev).forEach(k => { const [id, off] = k.split('@'); if (!P.byId[id] || !P.reviews.some(r => String(r.off) === off)) errs.push(`progress.rev: 键 ${k} 无效（格式 单元id@1/3/7）`); });
Object.keys(st.hol).forEach(k => { const [d, j] = k.split('#'); const h = raw.holiday.find(x => x.date === d); if (!h || !h.items[Number(j)]) errs.push(`progress.hol: 键 ${k} 无效（格式 日期#序号）`); });
Object.entries(st.log).forEach(([d, o]) => { if (!isDate(d)) errs.push(`progress.log: ${d} 不是日期`); Object.keys(o).forEach(id => { if (!P.byId[id]) errs.push(`progress.log.${d}: 没有单元 ${id}`); }); });

if (errs.length) { errs.forEach(e => console.error('✗ ' + e)); process.exit(1); }

const day = process.argv[2] || new Date().toISOString().slice(0, 10), n = Number(process.argv[3] || 5);
const s = schedule(P, st, day);
console.log(`✓ 校验通过：${P.units.length} 个单元，已完成 ${Object.keys(st.done).length}，剩余 ${P.units.reduce((a, u) => a + remOf(u, st), 0)} 块`);
if (s.overflow.length) console.log(`! 离校前排不完：${s.overflow.map(o => o.id + '×' + o.n).join(' ')}`);
s.days.slice(0, n).forEach(d => console.log(`  ${md(d.d)} ${WD[wd(d.d)]}  ${d.items.map(i => `${P.byId[i.id].course} ${P.byId[i.id].title}×${i.n}${i.late ? '(晚)' : ''}`).join(' | ') || '—'}`));
const rv = dueReviews(P, st, day);
if (rv.length) console.log(`  ${md(day)} 到期复习：${rv.map(x => x.id + ' ' + x.r.t).join('，')}`);

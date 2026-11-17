// 倒推计划的排程逻辑。页面 (index.html) 和校验脚本 (check.mjs) 共用这一份。
// 数据在 plan.json，进度在 progress.json，这里只放算法。

export const toT = s => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
export const toS = t => new Date(t).toISOString().slice(0, 10);
export const addDays = (s, n) => toS(toT(s) + n * 864e5);
export const diffDays = (a, b) => Math.round((toT(b) - toT(a)) / 864e5);
export const wd = s => new Date(toT(s)).getUTCDay();
export const WD = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
export const md = s => s.slice(5).replace('-', '/');

export const MAP_FIELDS = ['done', 'part', 'pull', 'rev', 'adj', 'hol', 'dl', 'log', 'failed'];

export function emptyState(plan) {
  const s = { cap: plan.defaultCapacity.slice() };
  MAP_FIELDS.forEach(k => { s[k] = {}; });
  return s;
}

// 把任意来源的进度对象整理成完整结构（缺字段补空）
export function normState(plan, s) {
  const b = emptyState(plan);
  if (!s || typeof s !== 'object') return b;
  MAP_FIELDS.forEach(k => { if (s[k] && typeof s[k] === 'object' && !Array.isArray(s[k])) b[k] = JSON.parse(JSON.stringify(s[k])); });
  if (Array.isArray(s.cap) && s.cap.length === 7) b.cap = s.cap.map(x => Math.max(0, Math.min(12, Math.round(Number(x) || 0))));
  return b;
}

// 把计划数据展开成页面用的结构：单元补默认值，建索引
export function loadPlan(raw) {
  const start = raw.dates.start;
  const units = raw.units.map(u => ({ kind: 'learn', from: start, fixed: '', ...u }));
  return { ...raw, units, byId: Object.fromEntries(units.map(u => [u.id, u])), dlById: Object.fromEntries(raw.deadlines.map(d => [d.id, d])) };
}

export const blocksOf = (u, st) => Math.max(1, u.blocks + (st.adj[u.id] || 0));
export const remOf = (u, st) => st.done[u.id] ? 0 : Math.max(1, blocksOf(u, st) - (st.part[u.id] || 0));

// coursework 提前两天做完；「提前做」(pull) 的单元从那天起排在最前面
function prio(u, st, d) {
  if (st.pull[u.id] && st.pull[u.id] <= d) return '0000-' + st.pull[u.id];
  return u.kind === 'cw' ? addDays(u.due, -2) : u.due;
}

// 剩余天数里按截止日最早优先排；没做完的自动顺延，不会消失
export function schedule(plan, st, today) {
  const { start, lastStudy } = plan.dates;
  const first = today < start ? start : today;
  const rem = {}; plan.units.forEach(u => { rem[u.id] = remOf(u, st); });
  const days = [], finish = {};
  for (let d = first; d <= lastStudy; d = addDays(d, 1)) {
    let cap = Math.max(0, st.cap[wd(d)] || 0);
    const items = [];
    while (cap > 0) {
      const c = plan.units
        .filter(u => rem[u.id] > 0 && (u.from <= d || (st.pull[u.id] && st.pull[u.id] <= d)) && !items.some(i => i.id === u.id))
        .sort((a, b) => { const ka = prio(a, st, d), kb = prio(b, st, d); return ka < kb ? -1 : ka > kb ? 1 : 0; })[0];
      if (!c) break;
      const n = Math.min(rem[c.id], cap, 3);
      rem[c.id] -= n; cap -= n;
      if (rem[c.id] === 0) finish[c.id] = d;
      items.push({ id: c.id, n, late: d > c.due, ends: rem[c.id] === 0 });
    }
    days.push({ d, items, buffer: d === lastStudy });
  }
  const overflow = plan.units.filter(u => rem[u.id] > 0).map(u => ({ id: u.id, n: rem[u.id] }));
  return { days, finish, overflow };
}

export function reviewsFor(plan, u, doneDate) {
  if (u.kind === 'cw') return [];
  return plan.reviews.map(r => ({ id: u.id, off: r.off, key: u.id + '@' + r.off, due: addDays(doneDate, r.off), r }))
    .filter(x => x.due <= plan.dates.lastStudy);
}

export function reviewLoad(plan, st, sched) {
  const load = {};
  plan.units.forEach(u => {
    const dd = st.done[u.id] || sched.finish[u.id];
    if (!dd) return;
    reviewsFor(plan, u, dd).forEach(x => { if (!st.rev[x.key]) load[x.due] = (load[x.due] || 0) + x.r.min; });
  });
  return load;
}

export function dueReviews(plan, st, today) {
  const out = [];
  plan.units.forEach(u => { if (st.done[u.id]) reviewsFor(plan, u, st.done[u.id]).forEach(x => { if (!st.rev[x.key] && x.due <= today) out.push(x); }); });
  return out.sort((a, b) => a.due < b.due ? -1 : a.due > b.due ? 1 : a.off - b.off);
}

// ---- 本机改动与 repo 进度的合并 ----
// base = 本机开始改动时 repo 里的进度；local = 本机当前进度；repo = 现在 repo 里的进度。
// 只把本机相对 base 改过的键套到 repo 上，所以 Codex 在 repo 里改的别的键不会被覆盖。
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export function merge3(plan, base, local, repo) {
  const out = normState(plan, repo);
  MAP_FIELDS.forEach(k => {
    const B = base[k] || {}, L = local[k] || {};
    new Set([...Object.keys(B), ...Object.keys(L)]).forEach(key => {
      if (same(B[key], L[key])) return;
      if (L[key] === undefined) delete out[k][key]; else out[k][key] = JSON.parse(JSON.stringify(L[key]));
    });
  });
  if (!same(base.cap, local.cap)) out.cap = local.cap.slice();
  return out;
}
export function countDiff(a, b) {
  let n = 0;
  MAP_FIELDS.forEach(k => { new Set([...Object.keys(a[k]), ...Object.keys(b[k])]).forEach(key => { if (!same(a[k][key], b[k][key])) n++; }); });
  if (!same(a.cap, b.cap)) n++;
  return n;
}

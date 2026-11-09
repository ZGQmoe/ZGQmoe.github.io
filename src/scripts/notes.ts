// 笔记页的交互：
//   - Mermaid 思维导图：卡片里可折叠，点「全屏」进入可缩放、拖动的查看器
//   - 内联的 SVG 图（figure[data-zoom]）：点一下也能全屏缩放
//   - 交互图（.lab-embed）：把仓库里的交互页嵌进正文，配色跟随本站深浅色
//   - 「本页」目录高亮、窄屏收起侧栏

let mermaidMod: Promise<any> | null = null;
let spy: IntersectionObserver | null = null;

const isDark = () => {
  const t = document.documentElement.dataset.theme;
  return t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
};

// ── Mermaid ────────────────────────────────────────────────
function mermaidConfig() {
  const dark = isDark();
  return {
    startOnLoad: false,
    securityLevel: "strict",
    theme: "base",
    themeVariables: dark
      ? {
          background: "transparent",
          primaryColor: "#0f2440",
          primaryBorderColor: "#3b82f6",
          primaryTextColor: "#e2ecf8",
          lineColor: "#6aa8ff",
          secondaryColor: "#10213a",
          tertiaryColor: "#0b1626",
          edgeLabelBackground: "#0b1626",
          fontFamily: "inherit",
        }
      : {
          background: "transparent",
          primaryColor: "#e8f2ff",
          primaryBorderColor: "#2563eb",
          primaryTextColor: "#14223a",
          lineColor: "#2b6cd8",
          secondaryColor: "#f1f7ff",
          tertiaryColor: "#ffffff",
          edgeLabelBackground: "#ffffff",
          fontFamily: "inherit",
        },
  };
}

async function renderMermaid() {
  const blocks = document.querySelectorAll<HTMLElement>('pre[data-language="mermaid"], pre > code.language-mermaid');
  if (!blocks.length) return;
  blocks.forEach((b) => {
    const pre = (b.tagName === "PRE" ? b : b.parentElement) as HTMLElement;
    const card = document.createElement("div");
    card.className = "diagram-card collapsed";
    card.innerHTML = `
      <div class="dc-bar">
        <span class="dc-title mono">Mind map</span>
        <button type="button" class="dc-btn" data-act="toggle">展开</button>
        <button type="button" class="dc-btn" data-act="full">全屏 ⤢</button>
      </div>
      <div class="dc-body"><div class="mermaid"></div></div>`;
    const m = card.querySelector<HTMLElement>(".mermaid")!;
    m.dataset.src = pre.textContent ?? "";
    m.textContent = m.dataset.src;
    pre.replaceWith(card);
  });
  mermaidMod ??= import(/* @vite-ignore */ "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs");
  const mermaid = (await mermaidMod).default;
  mermaid.initialize(mermaidConfig());
  await mermaid.run({ nodes: document.querySelectorAll(".mermaid:not([data-processed])") });
  // 内容不高就不需要「展开」
  document.querySelectorAll<HTMLElement>(".diagram-card").forEach((c) => {
    const body = c.querySelector<HTMLElement>(".dc-body")!;
    if (body.scrollHeight <= body.clientHeight + 4) {
      c.classList.remove("collapsed");
      c.querySelector('[data-act="toggle"]')?.remove();
    }
  });
}

async function rerenderMermaid() {
  const done = document.querySelectorAll<HTMLElement>(".mermaid[data-src]");
  if (!done.length || !mermaidMod) return;
  done.forEach((d) => {
    d.removeAttribute("data-processed");
    d.textContent = d.dataset.src ?? "";
  });
  const mermaid = (await mermaidMod).default;
  mermaid.initialize(mermaidConfig());
  await mermaid.run({ nodes: done });
}

// ── 全屏查看器：滚轮缩放、拖动平移、双击复位 ────────────────
function openViewer(svg: SVGSVGElement, title: string) {
  const ov = document.createElement("div");
  ov.className = "viewer";
  ov.innerHTML = `
    <div class="v-bar">
      <span class="mono">${title}</span>
      <span class="v-hint">滚轮缩放 · 拖动平移 · 双击复位</span>
      <button type="button" data-v="out" aria-label="缩小">−</button>
      <button type="button" data-v="in" aria-label="放大">+</button>
      <button type="button" data-v="reset">复位</button>
      <button type="button" data-v="close" aria-label="关闭">✕</button>
    </div>
    <div class="v-stage"><div class="v-inner"></div></div>`;
  const stage = ov.querySelector<HTMLElement>(".v-stage")!;
  const inner = ov.querySelector<HTMLElement>(".v-inner")!;
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.removeAttribute("style");
  clone.removeAttribute("width");
  clone.removeAttribute("height");
  inner.appendChild(clone);
  document.body.appendChild(ov);
  document.documentElement.classList.add("viewer-open");

  let s = 1;
  let x = 0;
  let y = 0;
  const apply = () => (inner.style.transform = `translate(${x}px, ${y}px) scale(${s})`);
  const fit = () => {
    s = 1;
    x = 0;
    y = 0;
    apply();
  };
  const zoomAt = (k: number, cx: number, cy: number) => {
    const r = stage.getBoundingClientRect();
    const px = cx - r.left - r.width / 2;
    const py = cy - r.top - r.height / 2;
    const ns = Math.min(12, Math.max(0.3, s * k));
    x = px - ((px - x) * ns) / s;
    y = py - ((py - y) * ns) / s;
    s = ns;
    apply();
  };
  stage.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY);
    },
    { passive: false },
  );
  // 拖动 + 双指缩放
  const pts = new Map<number, { x: number; y: number }>();
  let pinch = 0;
  stage.addEventListener("pointerdown", (e) => {
    stage.setPointerCapture(e.pointerId);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  });
  stage.addEventListener("pointermove", (e) => {
    const prev = pts.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    if (pts.size === 1) {
      x += cur.x - prev.x;
      y += cur.y - prev.y;
      apply();
    } else if (pts.size === 2) {
      const other = [...pts.entries()].find(([id]) => id !== e.pointerId)![1];
      const d = Math.hypot(cur.x - other.x, cur.y - other.y);
      if (pinch) zoomAt(d / pinch, (cur.x + other.x) / 2, (cur.y + other.y) / 2);
      pinch = d;
    }
    pts.set(e.pointerId, cur);
  });
  const up = (e: PointerEvent) => {
    pts.delete(e.pointerId);
    if (pts.size < 2) pinch = 0;
  };
  stage.addEventListener("pointerup", up);
  stage.addEventListener("pointercancel", up);
  stage.addEventListener("dblclick", fit);

  const close = () => {
    ov.remove();
    document.documentElement.classList.remove("viewer-open");
    removeEventListener("keydown", onKey);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") close();
    if (e.key === "+" || e.key === "=") zoomAt(1.25, innerWidth / 2, innerHeight / 2);
    if (e.key === "-") zoomAt(0.8, innerWidth / 2, innerHeight / 2);
  };
  addEventListener("keydown", onKey);
  ov.querySelector(".v-bar")!.addEventListener("click", (e) => {
    const v = (e.target as HTMLElement).dataset.v;
    if (v === "close") close();
    if (v === "in") zoomAt(1.3, innerWidth / 2, innerHeight / 2);
    if (v === "out") zoomAt(1 / 1.3, innerWidth / 2, innerHeight / 2);
    if (v === "reset") fit();
  });
}

// ── 交互图内嵌 ──────────────────────────────────────────────
function themeCss() {
  // 用本站的配色覆盖交互页自己的变量，背景透明
  const cs = getComputedStyle(document.documentElement);
  const v = (n: string) => cs.getPropertyValue(n).trim();
  return `
    :root{color-scheme:${isDark() ? "dark" : "light"} !important;--bg:transparent !important;--fg:${v("--fg")} !important;--muted:${v("--muted")} !important;--line:${v("--line")} !important;--blue:${isDark() ? "#7cb4ff" : "#2563eb"} !important}
    html,body{background:transparent !important}
    main{max-width:none !important;padding:4px 2px 8px !important}
    main > header, main > footer, nav[role=tablist]{display:none !important}
    select{background:${v("--bg-raise")} !important}`;
}

function styleLab(frame: HTMLIFrameElement) {
  const doc = frame.contentDocument;
  if (!doc) return;
  let st = doc.getElementById("site-theme") as HTMLStyleElement | null;
  if (!st) {
    st = doc.createElement("style");
    st.id = "site-theme";
    doc.head.appendChild(st);
  }
  st.textContent = themeCss();
}

function mountLabs() {
  document.querySelectorAll<HTMLElement>(".lab-embed:not([data-ready])").forEach((el) => {
    el.dataset.ready = "1";
    const src = el.dataset.src!;
    const hash = el.dataset.hash ?? "";
    el.innerHTML = `
      <div class="lab-bar">
        <span class="lab-badge mono">交互</span>
        <span class="lab-title"></span>
        <button type="button" class="dc-btn" data-act="lab-toggle">收起</button>
        <a class="dc-btn" href="${src}${hash ? "#" + hash : ""}" target="_blank" rel="noopener">新窗口 ↗</a>
      </div>
      <div class="lab-body"></div>`;
    el.querySelector(".lab-title")!.textContent = el.dataset.title ?? "";
    const body = el.querySelector<HTMLElement>(".lab-body")!;
    const frame = document.createElement("iframe");
    frame.loading = "lazy";
    frame.title = el.dataset.title ?? "交互图";
    frame.src = `${src}${hash ? "#" + hash : ""}`;
    frame.addEventListener("load", () => {
      styleLab(frame);
      const d = frame.contentDocument;
      if (!d) return;
      const fitHeight = () => (frame.style.height = `${Math.ceil(d.documentElement.scrollHeight)}px`);
      fitHeight();
      new ResizeObserver(fitHeight).observe(d.body);
    });
    body.appendChild(frame);
  });
}

// ── 「本页」目录 ─────────────────────────────────────────────
function tocSpy() {
  spy?.disconnect();
  const links = new Map<string, HTMLElement>();
  document.querySelectorAll<HTMLElement>("[data-toc]").forEach((a) => links.set(a.dataset.toc!, a));
  if (!links.size) return;
  spy = new IntersectionObserver(
    (entries) => {
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        links.forEach((a) => a.classList.remove("on"));
        links.get(en.target.id)?.classList.add("on");
      }
    },
    { rootMargin: "-80px 0px -70% 0px" },
  );
  links.forEach((_, id) => {
    const h = document.getElementById(id);
    if (h) spy!.observe(h);
  });
}

// ── 全局事件（只挂一次） ─────────────────────────────────────
document.addEventListener("click", (e) => {
  const t = e.target as HTMLElement;
  const btn = t.closest<HTMLElement>("[data-act]");
  if (btn?.dataset.act === "toggle") {
    const c = btn.closest(".diagram-card")!;
    c.classList.toggle("collapsed");
    btn.textContent = c.classList.contains("collapsed") ? "展开" : "收起";
    return;
  }
  if (btn?.dataset.act === "full") {
    const svg = btn.closest(".diagram-card")?.querySelector("svg");
    if (svg) openViewer(svg, "Mind map");
    return;
  }
  if (btn?.dataset.act === "lab-toggle") {
    const el = btn.closest(".lab-embed")!;
    el.classList.toggle("closed");
    btn.textContent = el.classList.contains("closed") ? "展开" : "收起";
    return;
  }
  // 点思维导图本身也进全屏
  const dc = t.closest<HTMLElement>(".dc-body");
  if (dc) {
    const svg = dc.querySelector("svg");
    if (svg) openViewer(svg, "Mind map");
    return;
  }
  const fig = t.closest<HTMLElement>("figure[data-zoom]");
  if (fig) {
    const svg = fig.querySelector("svg");
    if (svg) openViewer(svg, fig.querySelector("figcaption")?.textContent?.slice(0, 60) ?? "图");
  }
});

window.addEventListener("themechange", () => {
  rerenderMermaid();
  document.querySelectorAll<HTMLIFrameElement>(".lab-embed iframe").forEach(styleLab);
});

export function initNotesPage() {
  if (!document.querySelector(".notes-shell")) return;
  if (innerWidth < 820) document.querySelector(".side-box")?.removeAttribute("open");
  tocSpy();
  mountLabs();
  renderMermaid().catch((e) => console.warn("mermaid", e));
}

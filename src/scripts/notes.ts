// 笔记页：Mermaid 图、「本页」目录高亮、窄屏收起侧栏。

let mermaidMod: Promise<any> | null = null;
let spy: IntersectionObserver | null = null;

const isDark = () => {
  const t = document.documentElement.dataset.theme;
  return t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
};

async function renderMermaid() {
  const blocks = document.querySelectorAll<HTMLElement>(
    'pre[data-language="mermaid"], pre > code.language-mermaid',
  );
  if (!blocks.length) return;
  const nodes: HTMLElement[] = [];
  blocks.forEach((b) => {
    const pre = (b.tagName === "PRE" ? b : b.parentElement) as HTMLElement;
    if (pre.dataset.done) return;
    const div = document.createElement("div");
    div.className = "mermaid";
    div.dataset.src = pre.textContent ?? "";
    div.textContent = div.dataset.src;
    pre.replaceWith(div);
    nodes.push(div);
  });
  mermaidMod ??= import(/* @vite-ignore */ "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs");
  const mermaid = (await mermaidMod).default;
  mermaid.initialize({ startOnLoad: false, theme: isDark() ? "dark" : "neutral", securityLevel: "strict" });
  await mermaid.run({ nodes: document.querySelectorAll(".mermaid:not([data-processed])") });
}

// 切换深浅色时重画
window.addEventListener("themechange", async () => {
  const done = document.querySelectorAll<HTMLElement>(".mermaid[data-src]");
  if (!done.length || !mermaidMod) return;
  done.forEach((d) => {
    d.removeAttribute("data-processed");
    d.textContent = d.dataset.src ?? "";
  });
  const mermaid = (await mermaidMod).default;
  mermaid.initialize({ startOnLoad: false, theme: isDark() ? "dark" : "neutral", securityLevel: "strict" });
  await mermaid.run({ nodes: done });
});

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

export function initNotesPage() {
  if (!document.querySelector(".notes-shell")) return;
  if (innerWidth < 820) document.querySelector(".side-box")?.removeAttribute("open");
  tocSpy();
  renderMermaid().catch((e) => console.warn("mermaid", e));
}

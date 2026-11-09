// 全站的小交互。页面切换（ClientRouter）后通过 astro:page-load 重新挂载。

const root = document.documentElement;
const sys = matchMedia("(prefers-color-scheme: dark)");
const currentTheme = () => root.dataset.theme || (sys.matches ? "dark" : "light");
const announceTheme = () => window.dispatchEvent(new CustomEvent("themechange", { detail: currentTheme() }));
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

// ── 只需挂一次的东西 ─────────────────────────────────────────
document.addEventListener("click", (e) => {
  const t = e.target as HTMLElement;
  if (t.closest(".theme-btn")) {
    const next = currentTheme() === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {}
    announceTheme();
  } else if (t.closest(".to-top")) {
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  }
});
sys.addEventListener("change", () => {
  if (!root.dataset.theme) announceTheme();
});

// 卡片跟随鼠标的光斑：把指针位置写进 CSS 变量。
document.addEventListener("pointermove", (e) => {
  const el = (e.target as HTMLElement).closest?.<HTMLElement>(".spot");
  if (!el) return;
  const r = el.getBoundingClientRect();
  el.style.setProperty("--mx", `${e.clientX - r.left}px`);
  el.style.setProperty("--my", `${e.clientY - r.top}px`);
});

let ticking = false;
window.addEventListener(
  "scroll",
  () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      onScroll();
    });
  },
  { passive: true },
);

function onScroll() {
  const y = scrollY;
  document.querySelector(".to-top")?.classList.toggle("show", y > 600);
  const bar = document.querySelector<HTMLElement>(".progress");
  if (bar) {
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.setProperty("--read", String(max > 0 ? Math.min(1, y / max) : 0));
  }
}

console.log(
  "%c ><((((º>  %c 你好，欢迎来 TOMOchan 的海里看鲨鱼。源码：https://github.com/ZGQmoe/ZGQmoe.github.io",
  "color:#38bdf8;font-weight:bold",
  "color:inherit",
);

// ── 每次进入页面都要做的 ─────────────────────────────────────
let typeTimer = 0;

document.addEventListener("astro:page-load", () => {
  onScroll();

  // 滚动进入视口时淡入
  const io = new IntersectionObserver(
    (entries) => {
      for (const en of entries) {
        if (en.isIntersecting) {
          en.target.classList.add("in");
          io.unobserve(en.target);
        }
      }
    },
    { rootMargin: "0px 0px -8% 0px" },
  );
  document.querySelectorAll(".reveal").forEach((el, i) => {
    (el as HTMLElement).style.setProperty("--d", `${Math.min(i, 8) * 60}ms`);
    if (reduced) el.classList.add("in");
    else io.observe(el);
  });

  // 本站已运行 N 天
  document.querySelectorAll<HTMLElement>("[data-since]").forEach((el) => {
    const since = new Date(el.dataset.since + "T00:00:00");
    const days = Math.max(1, Math.floor((Date.now() - since.getTime()) / 86400000) + 1);
    const b = el.querySelector("b");
    if (b) b.textContent = String(days);
  });

  // 打字机
  clearTimeout(typeTimer);
  const tw = document.querySelector<HTMLElement>("[data-typewriter]");
  if (tw) {
    const words: string[] = JSON.parse(tw.dataset.typewriter || "[]");
    const out = tw.querySelector<HTMLElement>(".tw-text");
    if (out && words.length) {
      if (reduced) {
        out.textContent = words[0];
      } else {
        let w = 0;
        let n = 0;
        let deleting = false;
        const step = () => {
          const word = words[w];
          n += deleting ? -1 : 1;
          out.textContent = word.slice(0, n);
          let delay = deleting ? 40 : 90;
          if (!deleting && n === word.length) {
            deleting = true;
            delay = 1800;
          } else if (deleting && n === 0) {
            deleting = false;
            w = (w + 1) % words.length;
            delay = 350;
          }
          typeTimer = window.setTimeout(step, delay);
        };
        step();
      }
    }
  }

  // 随笔页筛选
  const buttons = document.querySelectorAll<HTMLButtonElement>(".filters button");
  const items = document.querySelectorAll<HTMLLIElement>(".list li[data-category]");
  buttons.forEach((b) =>
    b.addEventListener("click", () => {
      buttons.forEach((x) => x.classList.toggle("on", x === b));
      const f = b.dataset.filter;
      items.forEach((li) => (li.hidden = f !== "all" && li.dataset.category !== f));
    }),
  );
});

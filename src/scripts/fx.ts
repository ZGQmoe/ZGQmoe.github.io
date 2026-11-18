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
  // 背景鲨鱼种类 → Swift 枚举风格的名字
  const SHARK_CASE: Record<string, string> = {
    greathammer: ".greatHammerhead",
    hammerhead: ".hammerhead",
    thresher: ".thresher",
    tiger: ".tigerShark",
    mako: ".mako",
    zebra: ".zebraShark",
    nurse: ".nurseShark",
    classic: ".shark",
  };
  // 这次背景里正在游的鲨鱼（Ocean.astro 挑好后挂在 window.__sharks 上）
  const sharkNames = () => {
    const seen: string[] = (window as any).__sharks || [];
    const names = seen.map((k) => SHARK_CASE[k] || ".shark");
    return names.length ? names : [".shark"];
  };
  clearTimeout(typeTimer);
  const tw = document.querySelector<HTMLElement>("[data-typewriter]");
  const out = tw?.querySelector<HTMLElement>(".tw-text");
  const cursor = tw?.querySelector<HTMLElement>(".cursor");
  const words: string[] = tw ? JSON.parse(tw.dataset.typewriter || "[]") : [];
  const wait = (ms: number) => new Promise<void>((r) => (typeTimer = window.setTimeout(r, ms)));
  const token = {}; // 换页后旧的循环自动退出
  (window as any).__twToken = token;
  const alive = () => (window as any).__twToken === token && out?.isConnected;

  if (tw && out && cursor && words.length) {
    const single = words.length === 1 && words[0].includes("{shark}");
    if (single) {
      // 只有一句且带 {shark}：整句打完后只改括号里的鲨鱼名，三条轮流
      const [prefix, suffix] = words[0].split("{shark}");
      const names = sharkNames();
      const pre = document.createTextNode("");
      const name = document.createTextNode("");
      const suf = document.createTextNode("");
      out.replaceChildren(pre, name, suf);
      const full = prefix + names[0] + suffix;
      if (reduced) {
        out.textContent = full;
      } else {
        (async () => {
          // 1. 从头打整句，光标跟在末尾
          for (let n = 1; n <= full.length; n++) {
            if (!alive()) return;
            pre.data = full.slice(0, n);
            await wait(90);
          }
          if (names.length < 2) return;
          // 2. 把光标挪进括号里，之后只动鲨鱼名
          pre.data = prefix;
          name.data = names[0];
          out.insertBefore(cursor, suf);
          suf.data = suffix;
          let i = 0;
          while (alive()) {
            await wait(2200);
            for (let n = name.data.length - 1; n >= 0; n--) {
              if (!alive()) return;
              name.data = name.data.slice(0, n);
              await wait(45);
            }
            await wait(300);
            i = (i + 1) % names.length;
            const next = names[i];
            for (let n = 1; n <= next.length; n++) {
              if (!alive()) return;
              name.data = next.slice(0, n);
              await wait(90);
            }
          }
        })();
      }
    } else {
      // 多句：逐句打出再删掉，循环
      const fill = (s: string) => {
        const names = sharkNames();
        return s.replace("{shark}", names[Math.floor(Math.random() * names.length)]);
      };
      if (reduced) {
        out.textContent = fill(words[0]);
      } else {
        (async () => {
          let w = 0;
          while (alive()) {
            const word = fill(words[w]);
            for (let n = 1; n <= word.length; n++) {
              if (!alive()) return;
              out.textContent = word.slice(0, n);
              await wait(90);
            }
            await wait(1800);
            for (let n = word.length - 1; n >= 0; n--) {
              if (!alive()) return;
              out.textContent = word.slice(0, n);
              await wait(40);
            }
            await wait(350);
            w = (w + 1) % words.length;
          }
        })();
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

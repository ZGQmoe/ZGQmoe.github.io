// 站点的大部分可改内容都在这个文件里。

export const SITE = {
  title: "TOMOchan",
  author: "Guanqi",
  description: "Guanqi 的个人小站：项目、笔记、分析与杂文。",
  tagline: "EEE28'@UoM",
  bio: "曼大 EEE 在读。写点代码，记点笔记，偶尔分析游戏和作品。",
  startYear: 2026,
  /** 页脚「本站已运行 N 天」的起点 */
  since: "2026-11-09",
  /** 首页名字下面轮播打字的几句话 */
  typewriter: ["EEE28'@UoM", "写代码，记笔记", "在练 maimai 配置", "偶尔分析游戏和作品"],
};

export const NAV = [
  { href: "/", label: "首页" },
  { href: "/projects/", label: "项目" },
  { href: "/notes/", label: "笔记" },
  { href: "/writing/", label: "随笔" },
  { href: "/esp/", label: "a better lesson(s) in ESP" },
  { href: "/archive/", label: "归档" },
  { href: "/friends/", label: "友链" },
  { href: "/about/", label: "关于" },
];

// 首页和页脚的图标链接。想加平台就在这里加一行，icon 名见 components/Icon.astro。
export const SOCIALS: { label: string; href: string; icon: string }[] = [
  { label: "GitHub", href: "https://github.com/ZGQmoe", icon: "github" },
  { label: "RSS", href: "/rss.xml", icon: "rss" },
  // { label: "Bilibili", href: "https://space.bilibili.com/xxxx", icon: "bilibili" },
  // { label: "知乎", href: "https://www.zhihu.com/people/xxxx", icon: "zhihu" },
  // { label: "Email", href: "mailto:you@example.com", icon: "mail" },
];

// 文章分类。专业笔记不在这里，它来自各课程仓库（src/data/courses.mjs）。
export const CATEGORIES = {
  learn: { label: "学习拾遗", section: "notes" },
  analysis: { label: "分析", section: "writing" },
  essay: { label: "杂文", section: "writing" },
  esp: { label: "连载", section: "esp" },
} as const;

export type Category = keyof typeof CATEGORIES;

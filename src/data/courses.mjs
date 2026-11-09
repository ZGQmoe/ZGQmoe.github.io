// 专业笔记：每门课一个 GitHub 仓库，构建时由 scripts/sync-notes.mjs 拉取并转换。
// 加一门课就加一项。title 是按笔记内容起的描述性名字，不一定是课程官方名，可以自己改。
export const COURSES = [
  {
    code: "EEEN20131",
    slug: "eeen20131",
    title: "Signals and Systems",
    year: 2,
    repo: "ZGQmoe/EEEN-20131-Notes",
    extras: [{ label: "交互式 Signals Lab", href: "https://zgqmoe.github.io/EEEN-20131-Notes/visuals/signals-lab.html" }],
  },
  {
    code: "MATHS19622",
    slug: "maths19622",
    title: "多元微积分与概率统计",
    year: 1,
    repo: "ZGQmoe/MATHS-19622-Notes",
  },
  {
    code: "EEEN11102",
    slug: "eeen11102",
    title: "数字逻辑与数字电路",
    year: 1,
    repo: "ZGQmoe/EEEN-11102-Notes",
  },
  {
    code: "EEEN11302",
    slug: "eeen11302",
    title: "固体能带与导电性",
    year: 1,
    repo: "ZGQmoe/EEEN-11302-Notes",
  },
];

// 仓库里这些文件是给 AI / 自己看的，不上网站
export const EXCLUDE = ["CLAUDE.md", "AGENTS.md", "progress.md", "HANDOFF.md"];

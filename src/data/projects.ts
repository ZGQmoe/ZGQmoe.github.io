// 「项目」页和首页项目卡片的数据。
// live：在线可用的地址，点卡片直接打开；没有就点进仓库。repo：源码地址，卡片右上角的小图标。
// status: active 维护中 / paused 暂停 / archived 已归档
export type Project = {
  name: string;
  description: string;
  tags: string[];
  status: "active" | "paused" | "archived";
  live?: string;
  repo?: string;
  /** 卡片上的小字，比如「在线工具」「课程笔记」 */
  kind?: string;
};

export const PROJECTS: Project[] = [
  {
    name: "Mai Pattern Lab",
    kind: "在线工具",
    description: "maimai DX 配置练习：导入谱面，按纵连、交互、Slide 等配置挑出片段，按负荷从易到难练。",
    tags: ["maimai", "JavaScript"],
    status: "active",
    live: "",
    repo: "https://github.com/ZGQmoe/maimai-pattern-lab-public",
  },
  {
    name: "Course Notes",
    kind: "课程笔记",
    description: "曼大 EEE 的课程笔记，每门课一个仓库，在本站「笔记」里按科目阅读。",
    tags: ["EEE", "笔记"],
    status: "active",
    live: "/notes/",
  },
];

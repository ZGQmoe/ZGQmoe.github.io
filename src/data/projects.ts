// 「项目」页和首页「正在维护」的数据。status: active 正在维护 / paused / archived
export const PROJECTS = [
  {
    name: "Mai Pattern Lab",
    href: "https://github.com/ZGQmoe/maimai-pattern-lab-public",
    description: "maimai DX 配置练习工具，圆屏界面，按配置类型挑段落反复练。",
    tags: ["maimai", "TypeScript", "工具"],
    status: "active",
  },
  {
    name: "Course Notes",
    href: "https://github.com/ZGQmoe?tab=repositories&q=Notes",
    description: "曼大 EEE 的课程笔记，按课程分仓库维护。",
    tags: ["EEE", "笔记"],
    status: "active",
  },
] as const;

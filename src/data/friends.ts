// 友链。加一个人就在数组里加一项；avatar 可省略（会显示首字）。
export type Friend = { name: string; href: string; description?: string; avatar?: string };

export const FRIEND_GROUPS: { title: string; friends: Friend[] }[] = [
  {
    title: "朋友们",
    friends: [
      // { name: "某某", href: "https://example.com", description: "一句话介绍", avatar: "https://example.com/avatar.png" },
    ],
  },
];

// 别人来交换友链时可以抄的信息
export const MY_CARD = {
  name: "TOMOchan",
  href: "https://zgqmoe.github.io",
  description: "曼大 EEE · 项目、笔记、分析与杂文",
  avatar: "https://github.com/ZGQmoe.png",
};

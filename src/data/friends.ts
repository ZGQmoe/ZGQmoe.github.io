// 友链。加一个人就在数组里加一项；avatar 可省略（会显示首字）。
export type Friend = { name: string; href: string; description?: string; avatar?: string };

export const FRIEND_GROUPS: { title: string; friends: Friend[] }[] = [
  {
    title: "朋友们",
    friends: [
      { name: "txymcn", href: "https://txymcn.github.io/", description: "powered by ethanol", avatar: "/friends/txymcn.jpg" },
      { name: "桃子qwq · Rest Mode", href: "https://tao-xq.github.io/", description: "曼大 EEE · ACGN 幼稚园", avatar: "https://tao-xq.github.io/assets/owner-avatar-20261114.jpg" },
      // { name: "某某", href: "https://example.com", description: "一句话介绍", avatar: "https://example.com/avatar.png" },
    ],
  },
];

// 别人来交换友链时可以抄的信息。desc 不在这里写死，而是从 src/data/quotes.ts 里随机抽。
export const MY_CARD = {
  name: "TOMOchan",
  href: "https://zgqmoe.github.io",
  avatar: "https://github.com/ZGQmoe.png",
};

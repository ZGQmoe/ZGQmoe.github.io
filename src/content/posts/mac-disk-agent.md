---
title: AI整理桌面导致磁盘空间骤降的操作排查
date: 2026-11-23
category: essay
tags: [macOS, AI agent, APFS, 踩坑]
description: 为了让我的初代老M1继续拉磨，使用AI进行了一次桌面清理。本篇记录了清理到一半可用空间骤降的问题以及排查后的结果，仅个人分享。
cover: /images/mac-disk-agent/cover.jpg
draft: false
---

Context是本人自从买来这台笔记本之后就没认真分类清理过文件，直至最近实在没内存了于是使用了ChatGPT进行了全接管的清理。结果整理到一半，Mac 的可用空间直接掉到了115 MiB。

## 先交代一下背景

机器是一台 460 GiB 的 MacBook Air（M1）。整理的目标是：

- Downloads 里 500 多个文件全部收进 `Documents/资料归档/下载归档/`
- 桌面只留「大二学习」和「同步空间」两个入口，其余归档
- 顺手删掉一些确认过的重复文件

这些东西都在同一块盘、同一个 APFS 卷上，所以按理说移动是不占空间的：同卷 `mv` 只是改一下目录项，数据块根本不动。后来实测也证明了这一点：恢复之后移了 17 个文件，可用空间只差 41 MB 左右，基本就是系统后台写入的正常波动。

## 第一轮

ChatGPT 当时给的说法是"整批复制让系统可用空间降到约 115 MiB"。我和 Claude 第一轮排查时也顺着这个思路走，而且越看越像：

1. 空间骤降，正好发生在第一次批量复制之后
2. 后来经博主手动清理，回收了约21 GiB
3. 下载归档的大小，也正好是约21 GiB

当时看来这个逻辑是成立的：复制工具（`cp`、`rsync`、Python 的 `shutil`）默认不使用 APFS clone，会把 21 GiB 完整地再写一份，写满后复制失败，半成品进了废纸篓，清空废纸篓后空间回来。Claude 还提出 `rsync` 会把未写完的文件存成隐藏的 `.文件名.XXXXXX`，Finder 里看不到。

但在 Documents 和 Downloads 里搜了一遍，没有找到任何这类隐藏的半成品文件。

## 第二轮：让 ChatGPT 复盘

本地没有找到证据，Codex 的会话日志里也没有当天的记录（ChatGPT 桌面端的对话大概存在服务器上）。最后让 Claude 写了一段指令发给 ChatGPT，要求它原样贴出执行过的每条命令和每次 `df` 的输出，看不到的部分写"不确定"。

ChatGPT 的回复比较详细。它先更正了之前的说法：「整批复制导致骤降」是把先后发生的两件事说成了因果。当时它只执行了 `⌘A`、`⌘C`，还没粘贴就超时了。

其中有用的是这组读数：

| 时间点 | 可用空间 |
|---|---:|
| 全选 Downloads 之前（Finder 状态栏） | 2.37 GB |
| `⌘A` `⌘C` 超时之后（`df`） | 115 MiB |
| 重启之后、正式移动之前 | 3.5 GiB |
| 之后的整理、去重、归类 | 4.56 GB → 3.09 GB → 1.8 GiB → 1.2 GiB → 177 MiB → 117 MiB → 113 MiB |
| 博主手动删除一批文件后（不太重要） | 21 GiB |

第一行就说明了问题：骤降之前可用空间只剩 2.37 GB，实际只少了 2 GB 多，不可能写出过一份 21 GiB 的副本。后来回收的 21 GiB，是数据卷用量从 415 GiB 降到 394 GiB，来自博主自己删除的文件，而下载归档前后一直是 21G。两个 21 GiB 只是数字上的巧合。

## 那 2 GB 去了哪里

macOS 的启动盘除了数据卷，同一个 APFS 容器里还有 `/System/Volumes/VM`，用来放 swap（虚拟内存交换文件）。它和数据卷共用同一个空间池，内存紧张时会自动变大。

当时 VM 卷的读数是 11 GiB。下午又查了一次：

```text
$ sysctl vm.swapusage
vm.swapusage: total = 12288.00M  used = 10904.06M  free = 1383.94M  (encrypted)
```

12 GB 的 swap 用了 10.9 GB，说明这台机器的内存一直比较紧，系统长期在换页。

结合几组读数来看：

- 重启后可用空间多了约 3.4 GB。重启会清空 swap 和临时文件，与此吻合。
- 整理过程中可用空间持续下降，而同卷移动本身不占空间，持续增长的大概率是 swap 和缓存。
- 触发骤降的那一步是让 Finder 一次全选 582 个文件，同时生成图标和预览，内存压力较大，操作超时，ChatGPT 的控制脚本也被重置了。

因此比较合理的解释是：可用空间只剩 2 GB 多，Finder 一次处理 582 个文件带来内存压力，swap 增长，把剩余空间用完。空间用完后截图也无法保存，ChatGPT 报的 `failedToCreateImageDestination` 就是这个原因。

系统日志受沙盒限制无法读取，所以这只是与现有读数都不矛盾的解释，不能完全确认。

## 补充：删了 25 GiB，只回来 12 GiB

下午 Claude 又清理了大约 25 GiB：

- Codex、VS Code、C/C++ 插件的缓存，以及 Xcode 的 CoreSimulator 缓存、DeviceSupport、DerivedData 等，约 14 GiB
- Docker，约 11 GiB。只读打开 `Docker.raw` 看了一下，里面只有大一 EEEN11202 课程 lab 的两个 devcontainer，最后一次运行是 5 月，容器里记录的代码路径也已经失效，于是通过 Docker Desktop 正常卸载。

按计算，可用空间应从 21 GiB 增加到 45 GiB 左右，实际 `df` 显示 32 GiB。`tmutil listlocalsnapshots /` 的结果如下：

```text
com.apple.os.update-2CA9C36EDE01…
com.apple.os.update-60587424F539…
com.apple.os.update-MSUPrepareUpdate
```

这是三条系统更新快照。APFS 快照会保留拍摄时的磁盘内容，用于更新失败时回滚。拍摄时已经存在的文件，之后即使删除，数据块仍被快照引用，空间不会释放。`Docker.raw` 是 5 月创建的，Xcode 的缓存也存在很久了，很可能都在快照里。

处理方法是把已经准备好（`MSUPrepareUpdate`）但还没安装的系统更新装上，回滚期过后系统会自动清理旧快照。这几条快照由系统管理，`tmutil deletelocalsnapshots` 无法删除，也不建议强行处理。

## 其他人的做法

查了一下网上用 agent 清理 Mac 的文章和工具，大致有以下几条共识。

**先只读盘点，再动手。** 多数教程和工具的第一步是查清空间去向，而不是直接删除。例如 [mac-optimize](https://github.com/kylebrodeur/mac-optimize) 提供只读的 `diskreport`，面向运行大量 AI agent 的 Mac。

**模型负责排序，删除交给确定的规则。** [Mole 的这篇文章](https://mole.fit/blog/ai-mac-cleaner-tools.md)认为，模型适合判断文件夹归属、是否值得关注，但是否删除应由可审计的规则决定：排序错了只是浪费时间，删错了会丢数据。如果让 agent 直接用 shell 清理，建议让它调用带 dry run 的工具，不预先批准 `rm`，优先移到废纸篓，范围限制在单个目录。

**应用数据交给应用自己删除。** 比如 Ollama 的模型应使用 `ollama rm`，手动删除共享 blob 可能导致模型损坏。这次处理 Docker 也是同样思路，没有直接删除 `Docker.raw`。

**移动用 `mv`，不要先复制再删除。** Claude Code 的 [issue #32637](https://github.com/anthropics/claude-code/issues/32637) 记录了一次事故：Cowork 整理文件时先 `cp -a` 再 `rm -rf` 原文件夹，但这些文件开启了 iCloud「优化 Mac 储存空间」，本地只有 0 字节的占位文件。复制得到的都是空文件，删除原件后 iCloud 将其视为主动删除，云端副本也一并删除。

此外还有一些更严重的案例：Cowork 整理桌面时[删除了 15 年的家庭照片](https://incidentdatabase.ai/cite/1441/)；`rm -rf` 后多了 `~/`，[清空了整个主目录](https://www.docker.com/blog/coding-agent-horror-stories-the-rm-rf-incident/)；GPT-5.6 Sol 在 Codex 中[错误展开了 `$HOME`](https://incidentdatabase.ai/cite/1671/)。相比之下，这次只是磁盘被占满，没有数据损失。

## 与这次的对比

| 环节 | 常见做法 | 这次 |
|---|---|---|
| 开工前检查余量 | 留 10–15% 空闲空间给 swap 增长 | 没有检查，开工时只剩 2.4 GB，这是根本原因 |
| 执行方式 | 命令行工具 + dry run，结果确定 | 上午用电脑操控点 Finder，全选 582 项超时，还两次误建了 `New Folder With Items` 外层文件夹 |
| 操作日志 | 每一步留记录 | 上午没有留，复盘依赖 ChatGPT 的对话；下午的整理留了 `_整理记录.tsv`，可以按记录撤回 |
| 每批前后测余量 | 较少见 | 上午测了很多次 `df`，这些读数是最后定位问题的关键 |
| 删除 | 确定的清单 + 用户确认 + 优先废纸篓 | 一致：删除前列出清单确认，且 agent 只能访问授权过的文件夹 |

## 检查清单

1. 先测余量：`df -h /System/Volumes/Data /System/Volumes/VM` 和 `sysctl vm.swapusage`，低于 10% 先清理。
2. 同卷移动用 `mv`；需要复制时用 `cp -c`，走 APFS clone，不额外占空间。
3. 分批操作，不要让 Finder 一次处理几百个文件。
4. 每批操作前后记录一次 `df`，并保留操作日志。
5. 应用数据交给应用自己删除，Docker、Steam、Xcode 运行时都有各自的卸载入口。
6. 删除后空间没有回来，先查快照：`tmutil listlocalsnapshots /`。

## 结语

这次排查中，最初的推理链（空间骤降、恰好在复制之后、恰好 21 GiB）看起来很完整，但一直没有人回头确认骤降前的可用空间。答案其实就在 ChatGPT 记录的第一个读数里。


## 参考

- Eclectic Light：[What happens when a Mac's boot volumes run out of space?](https://eclecticlight.co/2026/09/07/what-happens-when-a-macs-boot-volumes-run-out-of-space/)
- Eclectic Light：[Copy, move and clone files in APFS, a primer](https://eclecticlight.co/2020/04/14/copy-move-and-clone-files-in-apfs-a-primer/)
- Mole：[AI Mac Cleaners: What a Model Should and Should Not Decide](https://mole.fit/blog/ai-mac-cleaner-tools.md)
- MindStudio：[Why Is My Mac Slow? AI Coding Agents May Be Eating Memory](https://www.mindstudio.ai/blog/mac-ai-agent-memory-management)
- Docker：[Coding Agent Horror Stories: The rm -rf Incident](https://www.docker.com/blog/coding-agent-horror-stories-the-rm-rf-incident/)
- anthropics/claude-code [#32637](https://github.com/anthropics/claude-code/issues/32637)

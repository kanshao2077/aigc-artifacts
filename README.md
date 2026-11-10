# AIGC Artifacts

以博物馆展厅的形式浏览生成式 AI 的发展。当前初版整理 106 个历史节点、54 个主展节点，附概念词典与平台谱系。

## 运行

使用已有 Node.js，不需要安装依赖。

```sh
npm run dev
```

打开 <http://127.0.0.1:4173/>。根地址先显示入口，点击进入第一件；带展品 hash 的链接直接打开展品。左右按钮与方向键切换展品；目录支持搜索、领域筛选、主展览和全部档案。同一年有多个已确认月份时，顶部按月份浏览。「资料索引」保留增量补充、材料版本和原始来源，不重复右侧正文。署名位于目录右下角。

```sh
npm run check
npm run build
```

`check` 检查数据、来源、媒体文件、关联与已确认界面约束。`build` 检查通过后复制静态文件到 `dist/`；本命令不会发布网站。

## 修改内容

- `data/foundations.json`：早期研究至 2021 年。
- `data/modern.json`：2022 年以后的技术与产品事件。
- `data/context.json`：训练、控制与治理的补充事件。
- `data/curation.json`：主展览取舍与事件 ID。
- `data/atlas.json`：概念词典、平台谱系与研究背景。
- `data/media.json`：实际使用的历史媒体索引；每件记录年代、内容、出处、署名和处理说明。
- `assets/history/`：展示用本地材料。`research/` 保存采集记录和原始文献，不复制到构建目录。

媒体支持图片（含 GIF）、原生音频对照、本地 MP4 与点击后加载的官方视频嵌入。外部播放器依赖原平台的网络可用性，本地视频支持分段请求且不预加载整片。

当前全部 106 个节点都有对应展示材料，覆盖 54 件主展与全部扩展档案。2026 年主展包含 GPT-5.4、Seedance 2.5、Claude Opus 5.5、Gemini 4 Argon 等资料；WaveNet 可试听三种 2016 年普通话合成方法，DreamFusion 可观看原始三维旋转样片。扩展档案也接入 Runway、Veo、Nano Banana、Pika 等官方演示。部分发布与治理材料采用明确标注的原文节录排印，不冒称同期截图。

## 来源

文字解说根据各事件 `sources` 整理，素材单独记录在媒体索引和 `research/*notes.md`。事件日、材料年代与后续修订版本并非总是相同，展示说明保留这一区别。

展厅视觉参考 Neal Agarwal 的 [Internet Artifacts](https://neal.fun/internet-artifacts/)。原站墙面、石柱等资源和第三方历史媒体仍归各自权利人；公开可访问不等于取得通用再分发许可。资源与处理说明见 [来源清单](SOURCE_ASSETS.md)。

后续界面调整先看 [REQUIREMENTS.md](REQUIREMENTS.md)，避免恢复已删去的视觉噪声。

# AI 灵感手帐 Chrome 插件

## 功能

在网页图片上右键，出现父菜单「AI 灵感手帐」，hover 后有两个子功能：

- 生成 Prompt：读取图片，调用本地手帐 API 反推 Prompt，并以浮层形式展示在当前网页上，支持一键复制。
- 保存至手帐：读取图片，保存到今天所在日期列，并自动生成关键词和 Prompt。

## 安装

1. 先启动本项目后端 API，例如：

   ```bash
   npm run server
   ```

2. 打开 Chrome 扩展管理页：`chrome://extensions`
3. 打开「开发者模式」
4. 点击「加载已解压的扩展程序」
5. 选择本目录：`chrome-extension`

## 设置

扩展详情页里点击「扩展程序选项」：

- API 地址默认是 `https://ai-journal-nmo9.onrender.com`
- 手帐应用地址默认是 `https://ai-journal-nmo9.onrender.com`
- Prompt 模板可改成你应用里正在使用的模板

## 注意

少数网站会阻止扩展读取图片原文件，这时 Chrome 通知会显示图片读取失败。普通 `<img>`、CDN 图片、data URL 图片通常可以正常工作。

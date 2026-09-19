# 课本游戏工坊

部署位置：`https://chengpeng9660.github.io/lesson-workshop/`

面向老师的 BYOK 课文互动游戏生成器。使用现有《棉花姑娘》绘本轻界面样机作为公开可玩的示例；生成器以受控的 HTML/CSS/JavaScript/SVG 模板渲染模型输出的课程 JSON，避免模型每次重新设计界面。

## 使用

1. 上传 PDF、UTF-8 TXT、Markdown 或本课 JPG/PNG/WebP。PDF 在本机读取，先选本课文件页码，一次最多 12 页；50 MB 文件上限、2 MB 文字文件上限。图片/扫描页最多 8 张，需要视觉模型识别；识别操作会单独调用 API。
2. 填写课文名称、年级，核对原文。每课最多 24,000 字符。不能可靠自动解读的图表、公式、拼音需要人工核对。未实现 DOCX 解析。
3. 填自己的服务商、模型和专用限额 API Key。内置 OpenRouter、DeepSeek、OpenAI 的 Chat Completions 接口与自定义 HTTPS Base URL。模型可修改，不保证所有模型支持同样参数；服务商必须允许浏览器跨域请求。
4. 明确勾选内容发送和费用授权，生成草稿。浏览器严格核对 JSON 结构和引用是否出现于指定原文；不自动证明题目正确。
5. 试玩，修改问题/选项/提示，应用修改并重新审核。下载一个无需网络、无需 API Key 的 HTML，或保存可编辑 JSON 后导回网站。

## 安全和数据边界

- 没有接收教材或密钥的自建后端。API Key 仅保留在当前页面内存/输入框，不使用 Cookie、localStorage、sessionStorage、URL 参数保存，不放入生成 JSON、HTML 或 GitHub。
- API 请求直接发到教师选定的服务商。更换服务商或地址会清空密钥和发送授权；禁止 URL 凭据、查询参数、非 HTTPS 接口和重定向。没有公共代理。
- BYOK 网页不等于绝对安全：浏览器扩展、同源脚本、设备和站点供应链可能访问密钥。建议使用可撤销、最低权限、限额专用密钥。正式部署建议使用校方自己的网关；OpenAI 官方推荐服务端保管密钥而非浏览器。教师输入的内容受所选 API 服务商政策约束。
- PDF.js 从固定版本构建并自托管，不运行动态第三方 CDN 脚本；禁用 PDF JavaScript 求值。GitHub Pages 本身有访问日志。不要上传学生个人信息。
- 模型只输出 JSON；重新构造白名单字段。所有模型文字用 textContent 渲染。SVG 仅来自项目自有图形库。预览使用不带 allow-same-origin 的 sandbox iframe；导出 CSP 禁止网络连接，不包含 API 代码。
- 不使用实时 AI 陪聊、语音上传、自动口语评分、排行榜或学生账户。“我说好了”仅代表开展表达活动。大屏一个人答对不等于全班掌握。
- 教师入口仍显示在同一屏幕，不是私人屏幕。学生 HTML 含本课原文、答案和教师参考，属于练习材料而非防作弊考试系统。
- 保留的《棉花姑娘》示例原文来自用户提供的教材转录；源教材印次未核定。发布者需确认材料版权与分享范围。其他教师上传文件不会自动发布到网站。

## 文件

- `index.html` / `studio.css` / `studio.js`：教师网站、上传、API 调用、预览与导出。
- `contract.js`：生成提示词、来源分段、结构和引用校验。
- `player.css` / `player.js`：儿童绘本游戏运行时，六类任务（选择、原文找证据、排序、配对、表达、探索）。
- `art.js` / `sound.js`：现有角色 SVG 和离线合成音乐。
- `demo.html`：原版轻界面样机（不是生成器本身）。
- `SKILL.md`：原始 skill 规则。运行时执行 `contract.js` 中适配网页的提示词；不声称在浏览器内运行完整 Codex skill。
- `vendor/`：固定版本 Mozilla PDF.js 和对应工作线程/字符映射/wasm（不打包独立字体文件）。
- `test_workshop.py`（构建分支根目录）：Playwright 回归测试；所有 API 响应使用模拟，不是付费模型实测。

## 维护与本地运行

项目不需要 React/Vue 或运行时构建。开发时用本地静态服务器，打开 `lesson-workshop/`；只有制作端需要网络。PDF 库在发布准备工作流中下载并固定提交。页面代码改变后重新跑回归测试；模型参数和名字需按服务商官方文档维护。

初始测试覆盖：首页桌面/手机宽度、旧版 demo 启动、模型 JSON 模拟生成、验证和手工审核、完整基础路径、编辑失效审核、密钥不落存储/导出、离线导出、PDF 解析（以 CI 实际结果为准）。未提供真实 Key，因此没有进行真实付费模型生成测试；也未做真实教室一体机和学生学习效果测试。

## 官方参考（核查于 2026-09-19）

- GitHub Pages：https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
- OpenRouter Chat Completions：https://openrouter.ai/docs/quickstart
- DeepSeek API：https://api-docs.deepseek.com/zh-cn/
- OpenAI API Key 安全：https://help.openai.com/en/articles/5112595-best-practices-for-api-key-safety
- PDF.js：https://mozilla.github.io/pdf.js/getting_started/

网站是教学草稿制作工具，不承诺所有教材、图片排版或模型输出自动正确。

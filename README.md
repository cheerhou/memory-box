# Memory Box

家庭数字记忆盒（Memory Box）是一个将孩子的照片快速转化为温暖成长日记的 AI Web 应用。MVP 目标和文案规范详见 [`docs/MVP-requirements.md`](docs/MVP-requirements.md)。

## Project Structure
- `app/page.tsx` – 首页上传 + AI 生成流程（状态机）。
- `app/memories/page.tsx` – 成长手账列表、编辑浮层、分享入口。
- `app/share/page.tsx` – 明信片预览与下载。
- `app/api/generate/route.ts` – 调用 OpenAI Vision 模型。
- `components/` – UI 组件与交互模块。
- `hooks/use-memories.ts` – 基于 `localStorage` 的记忆数据管理。
- `lib/` – Prompt 读取、配置、数据 Schema。
- `docs/` – 产品与设计文档。
- `prompts/` – AI 调用所需的系统提示词。

## Getting Started
1. 安装依赖：`npm install`
2. 启动开发环境：`npm run dev`
3. 打开浏览器访问 `http://localhost:3000`

> 需要在 `.env.local` 中配置 `OPENAI_API_KEY`（可选 `OPENAI_BASE_URL`、`OPENAI_MODEL_ID`）后，才能实现后续的 Vision 接口调用。

## Features
- 一体化上传 → 生成 → 编辑流程，成功后自动跳转成长手账并高亮最新条目。
- 首次引导填写孩子昵称与生日，之后自动带入昵称与实时年龄。
- 本地持久化记忆 (`localStorage`)，支持在手账页二次编辑、复制、明信片分享。
- 明信片页使用 `html2canvas` 生成 PNG，便于下载与分享。

## API
- `POST /api/generate`：提交 `FormData`，字段包含：
  - `photo`：单张 JPG/PNG 图片文件。
  - `childNickname`、`childAge`、`recentKeywords`（可选）用于补充上下文。
- 返回示例：
  ```jsonc
  {
    "diary": "最近的小希握着画笔认真涂色，脸上带着软软的笑，像是在向妈妈展示新作 🌈",
    "usage": {
      "promptTokens": 123,
      "completionTokens": 45,
      "totalTokens": 168
    }
  }
  ```

## Next Steps
- 优化移动端体验：文件选择反馈、骨架屏、生成动画。
- 为手账与明信片引入手写风字体 / 贴纸风格，统一视觉语言。
- 增加数据导出/同步方案（如下载 JSON、云备份）。
- 添加核心逻辑测试（AI API 调用、存储 Hook、分享下载流程）。

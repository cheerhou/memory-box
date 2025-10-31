# Memory Box

家庭数字记忆盒（Memory Box）是一个将孩子的照片快速转化为温暖成长日记的 AI Web 应用。MVP 目标和文案规范详见 [`docs/MVP-requirements.md`](docs/MVP-requirements.md)。

## Project Structure
- `app/` – Next.js App Router 页面、全局样式与即将加入的 API Route。
- `components/` – 预留给 UI 组件。
- `lib/prompt.ts` – 读取 `prompts/memory-box-vision-prompt.md` 的工具函数。
- `docs/` – 产品与设计文档。
- `prompts/` – AI 调用所需的系统提示词。

## Getting Started
1. 安装依赖：`npm install`
2. 启动开发环境：`npm run dev`
3. 打开浏览器访问 `http://localhost:3000`

> 需要在 `.env.local` 中配置 `OPENAI_API_KEY`（可选 `OPENAI_BASE_URL`、`OPENAI_MODEL_ID`）后，才能实现后续的 Vision 接口调用。

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
- 优化移动端上传体验（拖拽提示、loading skeleton、失败重试）。
- 调整排版与配色，接入手写风格字体，增强生成区视觉。
- 评估分享功能（临时链接或 Web Share API），方便转发给家人。
- 补充单元/端到端测试，保障 API 调用与错误提示逻辑。

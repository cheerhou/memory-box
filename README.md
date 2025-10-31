# Memory Box

家庭数字记忆盒（Memory Box）是一款用 AI 把孩子的日常照片转写成温暖日记的 Web 应用。它把“上传照片 → 生成文案 → 收藏分享”打包成一条轻盈的动线，让记录变成一件 5 分钟的小事。

## ✨ 核心体验
- **一次引导，长期记忆**：首次使用会采集孩子的昵称与生日，此后自动推算年龄、带入昵称。
- **单页状态机**：上传照片 → 检查/补充提示 → 生成日记 → 手动润色，全部在首页完成。
- **本地收藏手账**：生成的内容持久化在浏览器 `localStorage`，可在“成长手账”中再编辑、删除或复制文本。
- **明信片分享**：任意记录可生成手写风明信片，支持 HTML2Canvas 一键导出 PNG。
- **手写 × 系统字体混排**：情感类文案使用 Ma Shan Zheng / Dancing Script，操作文本保持系统字体保证可读性。

## 🗂️ 目录速览
| 路径 | 说明 |
| --- | --- |
| `app/page.tsx` | 首页与上传流程（状态机 + 客户端组件） |
| `app/memories/page.tsx` | 成长手账列表、编辑浮层、删除确认 |
| `app/share/page.tsx` | 明信片预览、下载逻辑 |
| `app/api/generate/route.ts` | 调用 OpenAI Vision（Vercel AI SDK + 自定义 base URL） |
| `components/MemoryBoxApp.tsx` | 首页主交互（文件选择、生成、保存） |
| `hooks/use-memories.ts` | 记忆的本地存储、统计与同步 |
| `hooks/use-profile.ts` | 孩子资料的本地存储与年龄推算 |
| `lib/prompt.ts` | 读取 `prompts/memory-box-vision-prompt.md` 的工具 |
| `tailwind.config.ts` | 主题色、手写字体家族、卡片阴影配置 |
| `docs/` | 需求与产品文档，`requirements-v1.md` 为现行规范 |
| `prompts/` | Vision 提示词（Markdown 结构，便于复用） |

## ⚙️ 快速启动
```bash
npm install
npm run dev
# 浏览器访问 http://localhost:3000
```

> **环境变量**  
> - `OPENAI_API_KEY`：必填，用于调用 Vision 模型  
> - `OPENAI_BASE_URL`：可选，支持自定义代理（默认 `https://api.openai.com/v1`）  
> - `OPENAI_MODEL_ID`：可选，默认 `gpt-4o-mini`。现成配置与项目里的提示词适配。

## 🧠 数据与状态流
1. **Profile（孩子资料）**：`useProfile()` 负责读取/存储昵称与生日并计算年龄显示。数据保存在 `localStorage`。
2. **Memories（手账记录）**：`useMemories()` 管理记忆列表、增删改、统计和跨标签页同步。
3. **AI 生成**：`app/api/generate/route.ts` 使用 `@ai-sdk/openai` 和 `ai` 库的 `generateText`，将上传图片转成 base64 data URL，再组合系统 & 用户消息调用 Vision 模型。
4. **文案提示词**：`prompts/memory-box-vision-prompt.md` 以 Markdown 定义系统角色与用户模板，`loadMemoryBoxVisionPrompt()` 负责在 Server 端读取。
5. **静态资源**：暂无持久化上传，所有照片只在前端与 API 之间传递，不落盘。

## 🎨 视觉与排版
- **主色**：`#fdfaf6`（纸张米白背景）、`#E87A6D`（珊瑚红按钮）、`#333`（正文）、`#666`（辅助文字）
- **纸张纹理**：通过 CSS 背景渐变模拟轻薄肌理，无需额外纹理图。
- **字体分工**：
  - `font-script`（Ma Shan Zheng / Dancing Script）：标题、日记正文等情感内容
  - `font-accent`（Zhi Mang Xing）：日期、年龄、提示标签
  - `font-button`（Patrick Hand + 系统 UI）：按钮与交互文字
  - `font-signature`（Caveat）：明信片落款
  - `font-sans`：系统默认字体，用于说明文字、错误提示等

## 🧪 常用命令
| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 生产构建（Next.js） |
| `npm run start` | 本地启动构建后的产物 |
| `npm run lint` | ESLint + Next.js 规则校验 |

> 项目暂未内置单元测试，建议在迭代中补充对 `hooks/use-memories` 和 API 路由的测试。

## 🔌 接口说明
`POST /api/generate`
```http
Content-Type: multipart/form-data
photo=<File> (必填, JPG/PNG)
childNickname=<string?> 可选
childAge=<string?> 可选
recentKeywords=<string?> 可选
```
响应示例：
```json
{
  "diary": "最近的小希握着画笔认真涂色，脸上带着软软的笑，像是在向妈妈展示新作 🌈",
  "usage": {
    "promptTokens": 123,
    "completionTokens": 45,
    "totalTokens": 168
  }
}
```

## 🛣️ 后续方向（建议）
1. **离线/云备份**：导出 JSON、接入 KV / Supabase 等同步方案。
2. **移动端优化**：上传反馈、生成动画、骨架屏。
3. **可访问性**：增加键盘导航与可见焦点，改进色彩对比。
4. **测试与监控**：为 hooks 和 API 写单测，引入错误上报（如 Sentry）。
5. **多媒体扩展**：支持短语音或录音（与文本一同生成纪念内容）。

想深入了解产品初衷与 MVP 范围，可以查看 [`docs/requirements-v1.md`](docs/requirements-v1.md)。祝你记录顺利，也欢迎继续把“数字记忆盒”打磨成家人间传递温度的小工具。 ***

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { loadMemoryBoxVisionPrompt } from "@/lib/prompt";
import {
  getOpenAIApiKey,
  getOpenAIBaseUrl,
  getOpenAIModelId
} from "@/lib/config";

export const runtime = "nodejs";

function buildUserPrompt({
  childNickname,
  childAge,
  recentKeywords
}: {
  childNickname?: string;
  childAge?: string;
  recentKeywords?: string;
}) {
  const supplements = [
    childNickname && `- 孩子昵称：${childNickname}`,
    childAge && `- 年龄：${childAge}`,
    recentKeywords && `- 最近的关键词或事件：${recentKeywords}`
  ]
    .filter(Boolean)
    .join("\n");

  return [
    "请根据我提供的照片与上下文信息，用中文写一段成长日记。",
    supplements
      ? `补充信息（若有则参考，没有则忽略）：\n${supplements}`
      : "暂无额外补充信息。",
    "请观察上方图片，生成符合准则的文案。"
  ].join("\n\n");
}

function isBlobLike(value: unknown): value is Blob {
  return (
    typeof value === "object" &&
    value !== null &&
    "arrayBuffer" in value &&
    typeof (value as Blob).arrayBuffer === "function"
  );
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const photo = formData.get("photo");

    if (!isBlobLike(photo)) {
      return NextResponse.json(
        { error: "Missing photo file in request payload." },
        { status: 400 }
      );
    }

    const mimeType =
      "type" in photo && typeof photo.type === "string"
        ? photo.type
        : "application/octet-stream";

    if (!mimeType.startsWith("image/")) {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload a JPG or PNG image." },
        { status: 400 }
      );
    }

    const [systemPrompt, imageArrayBuffer] = await Promise.all([
      loadMemoryBoxVisionPrompt(),
      photo.arrayBuffer()
    ]);

    const imageBuffer = Buffer.from(imageArrayBuffer);

    const childNickname = formData.get("childNickname")?.toString().trim();
    const childAge = formData.get("childAge")?.toString().trim();
    const recentKeywords = formData.get("recentKeywords")?.toString().trim();

    const userPrompt = buildUserPrompt({
      childNickname: childNickname || undefined,
      childAge: childAge || undefined,
      recentKeywords: recentKeywords || undefined
    });

    const client = new OpenAI({
      apiKey: getOpenAIApiKey(),
      baseURL: getOpenAIBaseUrl()
    });

    const response = await client.chat.completions.create({
      model: getOpenAIModelId(),
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            {
              type: "image_url",
              image_url: { url: `data:${mimeType};base64,${imageBuffer.toString("base64")}` }
            }
          ]
        }
      ],
      max_tokens: 200,
      temperature: 0.7
    });

    const message = response.choices?.[0]?.message;
    let diary: string | undefined;

    if (typeof message?.content === "string") {
      diary = message.content.trim();
    } else if (Array.isArray(message?.content)) {
      diary = message.content
        .map((part) => {
          if (typeof part === "string") {
            return part;
          }
          if (part?.type === "text") {
            return part.text ?? "";
          }
          return "";
        })
        .join("")
        .trim();
    }

    if (!diary) {
      throw new Error("模型未返回文本内容，请稍后重试。");
    }

    return NextResponse.json(
      {
        diary,
        usage: response.usage
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[generate] Failed to produce diary entry", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unexpected error while generating diary entry."
      },
      { status: 500 }
    );
  }
}

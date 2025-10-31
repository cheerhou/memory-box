import "server-only";

export function getOpenAIApiKey() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not set. Please add it to your environment configuration."
    );
  }
  return apiKey;
}

export function getOpenAIBaseUrl() {
  return process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
}

export function getOpenAIModelId() {
  return process.env.OPENAI_MODEL_ID || "gpt-4o-mini";
}

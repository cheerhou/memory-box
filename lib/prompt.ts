import { readFile } from "node:fs/promises";
import { join } from "node:path";

const promptPath = join(
  process.cwd(),
  "prompts",
  "memory-box-vision-prompt.md"
);

export const memoryBoxVisionPromptPath = promptPath;

/**
 * Loads the Memory Box vision prompt from disk.
 * Use this helper inside Server Actions or Route Handlers.
 */
export async function loadMemoryBoxVisionPrompt() {
  return readFile(promptPath, "utf8");
}

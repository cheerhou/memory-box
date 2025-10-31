import type { z } from "zod";
import { memorySchema } from "./schemas";

export type Memory = z.infer<typeof memorySchema>;

export const STORAGE_KEY = "memory-box/memories";

export function parseMemories(raw: string | null): Memory[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    const result = memorySchema.array().safeParse(parsed);
    if (!result.success) {
      console.warn("[memories] Failed schema validation", result.error);
      return [];
    }
    return result.data;
  } catch (error) {
    console.error("[memories] Failed to parse stored memories", error);
    return [];
  }
}

export function serializeMemories(memories: Memory[]): string {
  return JSON.stringify(memories);
}

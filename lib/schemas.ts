import { z } from "zod";

export const memorySchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  photoDataUrl: z.string(),
  diary: z.string(),
  nickname: z.string().optional(),
  age: z.string().optional(),
  keywords: z.string().optional()
});

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

export const profileSchema = z.object({
  nickname: z.string().min(1),
  birthdate: z.string().min(1)
});

import type { z } from "zod";
import { profileSchema } from "./schemas";

export type Profile = z.infer<typeof profileSchema>;

export const PROFILE_STORAGE_KEY = "memory-box/profile";

export function parseProfile(raw: string | null): Profile | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const result = profileSchema.safeParse(parsed);
    if (!result.success) {
      console.warn("[profile] Failed schema validation", result.error);
      return null;
    }
    return result.data;
  } catch (error) {
    console.error("[profile] Failed to parse stored profile", error);
    return null;
  }
}

export function serializeProfile(profile: Profile): string {
  return JSON.stringify(profile);
}

export function calculateAgeLabel(birthdate: string, referenceDate: Date = new Date()) {
  const birth = new Date(birthdate);
  if (Number.isNaN(birth.getTime())) return "";

  let years = referenceDate.getFullYear() - birth.getFullYear();
  let months = referenceDate.getMonth() - birth.getMonth();
  let days = referenceDate.getDate() - birth.getDate();

  if (days < 0) {
    const previousMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 0).getDate();
    days += previousMonth;
    months -= 1;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years < 0) return "";

  const parts: string[] = [];
  if (years > 0) {
    parts.push(`${years} 岁`);
  }
  if (months > 0 && years < 6) {
    parts.push(`${months} 个月`);
  }
  if (parts.length === 0) {
    if (days > 0) {
      parts.push(`${days} 天`);
    } else {
      parts.push("刚到来");
    }
  }

  return parts.join(" ");
}

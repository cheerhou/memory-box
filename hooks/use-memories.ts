'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { nanoid } from 'nanoid';
import { Memory, STORAGE_KEY, parseMemories, serializeMemories } from '@/lib/memories';

export const STORAGE_QUOTA_ERROR_CODE = 'STORAGE_QUOTA_EXCEEDED';

type CreateMemoryInput = {
  diary: string;
  photoDataUrl: string;
  nickname?: string;
  age?: string;
  keywords?: string;
};

type UpdateMemoryInput = Partial<Omit<CreateMemoryInput, 'photoDataUrl'>> & {
  diary?: string;
};

export function useMemories() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    setMemories(parseMemories(stored));
    setIsReady(true);

    const sync = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      setMemories(parseMemories(event.newValue));
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  const persist = useCallback((next: Memory[]) => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_KEY, serializeMemories(next));
      } catch (error) {
        console.error('[memories] Failed to persist memories', error);
        if (
          error instanceof DOMException &&
          (error.name === 'QuotaExceededError' || error.code === 22)
        ) {
          throw new Error(STORAGE_QUOTA_ERROR_CODE);
        }
        throw error;
      }
    }
    setMemories(next);
  }, []);

  const addMemory = useCallback(
    (input: CreateMemoryInput) => {
      const now = new Date().toISOString();
      const newMemory: Memory = {
        id: nanoid(),
        createdAt: now,
        photoDataUrl: input.photoDataUrl,
        diary: input.diary,
        nickname: input.nickname,
        age: input.age,
        keywords: input.keywords
      };
      persist([newMemory, ...memories]);
      return newMemory;
    },
    [memories, persist]
  );

  const updateMemory = useCallback(
    (id: string, input: UpdateMemoryInput) => {
      const next = memories.map((memory) => {
        if (memory.id !== id) return memory;
        return {
          ...memory,
          diary: input.diary ?? memory.diary,
          nickname: input.nickname ?? memory.nickname,
          age: input.age ?? memory.age,
          keywords: input.keywords ?? memory.keywords
        };
      });
      persist(next);
    },
    [memories, persist]
  );

  const deleteMemory = useCallback(
    (id: string) => {
      persist(memories.filter((memory) => memory.id !== id));
    },
    [memories, persist]
  );

  const stats = useMemo(() => {
    if (!memories.length) {
      return { total: 0, firstDate: null, daysTogether: 0 };
    }
    const sorted = [...memories].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const firstDate = new Date(sorted[0].createdAt);
    const diff = Date.now() - firstDate.getTime();
    const daysTogether = Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    return {
      total: memories.length,
      firstDate,
      daysTogether
    };
  }, [memories]);

  return {
    isReady,
    memories,
    addMemory,
    updateMemory,
    deleteMemory,
    stats
  };
}

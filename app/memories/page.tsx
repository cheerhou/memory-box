'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useMemories } from '@/hooks/use-memories';

export default function MemoriesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('highlight');

  const { memories, updateMemory, stats, isReady } = useMemories();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftDiary, setDraftDiary] = useState('');
  const [draftNickname, setDraftNickname] = useState('');
  const [draftAge, setDraftAge] = useState('');
  const [draftKeywords, setDraftKeywords] = useState('');

  const editingMemory = useMemo(
    () => memories.find((memory) => memory.id === editingId) ?? null,
    [editingId, memories]
  );

  useEffect(() => {
    if (!highlightId || !memories.length) return;
    const element = document.getElementById(`memory-${highlightId}`);
    if (!element) return;
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    element.classList.add('ring-2', 'ring-memory-rose', 'shadow-lg');
    const timeout = setTimeout(() => {
      element.classList.remove('ring-2', 'ring-memory-rose', 'shadow-lg');
    }, 3600);
    const search = new URLSearchParams(searchParams.toString());
    search.delete('highlight');
    router.replace(`/memories${search.toString() ? `?${search}` : ''}`, {
      scroll: false
    });
    return () => clearTimeout(timeout);
  }, [highlightId, memories, router, searchParams]);

  useEffect(() => {
    if (!editingMemory) return;
    setDraftDiary(editingMemory.diary);
    setDraftNickname(editingMemory.nickname ?? '');
    setDraftAge(editingMemory.age ?? '');
    setDraftKeywords(editingMemory.keywords ?? '');
  }, [editingMemory]);

  useEffect(() => {
    if (!editingId) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setEditingId(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [editingId]);

  const handleOpenEditor = (id: string) => {
    setEditingId(id);
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    const trimmedDiary = draftDiary.trim();
    if (!trimmedDiary) return;
    updateMemory(editingId, {
      diary: trimmedDiary,
      nickname: draftNickname.trim() || undefined,
      age: draftAge.trim() || undefined,
      keywords: draftKeywords.trim() || undefined
    });
    setEditingId(null);
  };

  const daysText = useMemo(() => {
    if (!stats.total) return '还没有记录，今晚就开始吧！';
    return `已记录 ${stats.total} 个闪光日子 · 一起走过的第 ${stats.daysTogether} 天`;
  }, [stats]);

  return (
    <main className="flex min-h-screen flex-col gap-10 px-6 py-16">
      <header className="mx-auto w-full max-w-4xl text-center">
        <h1 className="text-4xl font-semibold text-memory-ink sm:text-5xl">
          我们的成长手账 📖
        </h1>
        <p className="mt-4 text-base text-memory-ink/70">{daysText}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="rounded-xl bg-memory-rose px-5 py-3 text-sm font-semibold text-white transition hover:bg-memory-rose/90"
          >
            添加今天的闪光时刻
          </Link>
        </div>
      </header>

      {!isReady && (
        <p className="text-center text-sm text-memory-ink/50">
          正在为你打开手账页面，请稍候…
        </p>
      )}

      {isReady && memories.length === 0 && (
        <section className="mx-auto flex w-full max-w-4xl flex-col items-center gap-4 rounded-3xl border border-memory-rose/30 bg-white/80 p-10 text-center shadow-sm">
          <p className="text-lg text-memory-ink/80">手账还空着，去记录第一束闪光吧 ✨</p>
          <Link
            href="/"
            className="rounded-xl border border-memory-rose/50 bg-memory-cream px-4 py-2 text-sm font-medium text-memory-ink transition hover:bg-white"
          >
            现在就去记录
          </Link>
        </section>
      )}

      {isReady && memories.length > 0 && (
        <section className="mx-auto grid w-full max-w-5xl gap-6">
          {memories.map((memory) => (
            <article
              key={memory.id}
              id={`memory-${memory.id}`}
              className="group grid gap-4 rounded-3xl border border-memory-rose/30 bg-white/80 p-6 shadow-sm transition hover:shadow-md md:grid-cols-[160px_1fr]"
            >
              <div className="relative overflow-hidden rounded-2xl bg-memory-cream/60">
                <Image
                  src={memory.photoDataUrl}
                  alt="成长瞬间"
                  fill
                  className="object-cover"
                  sizes="(min-width: 768px) 160px, 100vw"
                  unoptimized
                />
              </div>

              <div className="flex flex-col justify-between gap-4">
                <div className="space-y-3">
                  <p className="text-base leading-relaxed text-memory-ink">{memory.diary}</p>
                  <div className="text-xs text-memory-ink/50">
                    <span>
                      记录于 {new Date(memory.createdAt).toLocaleDateString('zh-CN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                    {memory.nickname && <span> · {memory.nickname}</span>}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleOpenEditor(memory.id)}
                    className="rounded-xl border border-memory-rose/50 bg-white px-4 py-2 text-sm font-medium text-memory-ink transition hover:bg-memory-cream"
                  >
                    轻轻改一改
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(`/share?memoryId=${memory.id}`)}
                    className="rounded-xl bg-memory-rose px-4 py-2 text-sm font-semibold text-white transition hover:bg-memory-rose/90"
                  >
                    寄明信片
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      {editingMemory && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4 py-10 backdrop-blur-sm" onClick={() => setEditingId(null)}>
          <div
            className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-3xl border border-memory-rose/40 bg-white p-6 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="space-y-2">
              <h2 className="text-xl font-semibold text-memory-ink">轻轻改一改</h2>
              <p className="text-xs text-memory-ink/60">调整文字，保留这份温柔记忆。</p>
            </header>

            <label className="space-y-2">
              <span className="text-xs font-medium text-memory-ink/70">成长日记</span>
              <textarea
                value={draftDiary}
                onChange={(event) => setDraftDiary(event.target.value)}
                rows={6}
                maxLength={180}
                className="w-full rounded-xl border border-memory-rose/40 bg-memory-cream/30 px-3 py-3 text-sm leading-relaxed text-memory-ink outline-none transition focus:border-memory-rose focus:ring-2 focus:ring-memory-rose/30"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-memory-ink/70">孩子昵称</label>
                <input
                  type="text"
                  value={draftNickname}
                  onChange={(event) => setDraftNickname(event.target.value)}
                  maxLength={20}
                  className="w-full rounded-xl border border-memory-rose/40 bg-white px-3 py-2 text-sm text-memory-ink outline-none transition focus:border-memory-rose focus:ring-2 focus:ring-memory-rose/30"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-memory-ink/70">年龄</label>
                <input
                  type="text"
                  value={draftAge}
                  onChange={(event) => setDraftAge(event.target.value)}
                  maxLength={20}
                  className="w-full rounded-xl border border-memory-rose/40 bg-white px-3 py-2 text-sm text-memory-ink outline-none transition focus:border-memory-rose focus:ring-2 focus:ring-memory-rose/30"
                />
              </div>

              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-medium text-memory-ink/70">关键词或事件</label>
                <input
                  type="text"
                  value={draftKeywords}
                  onChange={(event) => setDraftKeywords(event.target.value)}
                  maxLength={50}
                  className="w-full rounded-xl border border-memory-rose/40 bg-white px-3 py-2 text-sm text-memory-ink outline-none transition focus:border-memory-rose focus:ring-2 focus:ring-memory-rose/30"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="rounded-xl border border-memory-rose/40 bg-white px-4 py-2 text-sm font-medium text-memory-ink transition hover:bg-memory-cream"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={!draftDiary.trim()}
                className="rounded-xl bg-memory-rose px-5 py-2 text-sm font-semibold text-white transition hover:bg-memory-rose/90 disabled:cursor-not-allowed disabled:bg-memory-rose/60"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useMemories } from '@/hooks/use-memories';

export default function MemoriesPage() {
  const router = useRouter();
  const highlightId = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('highlight')
    : null;

  const { memories, updateMemory, deleteMemory, stats, isReady } = useMemories();
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftDiary, setDraftDiary] = useState('');
  const [draftKeywords, setDraftKeywords] = useState('');

  const editingMemory = useMemo(
    () => memories.find((memory) => memory.id === editingId) ?? null,
    [editingId, memories]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!highlightId || !memories.length) return;
    const element = document.getElementById(`memory-${highlightId}`);
    if (!element) return;
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    element.classList.add('ring-2', 'ring-memory-coral', 'shadow-lg');
    const timeout = setTimeout(() => {
      element.classList.remove('ring-2', 'ring-memory-coral', 'shadow-lg');
    }, 3600);
    const search = new URLSearchParams(window.location.search);
    search.delete('highlight');
    router.replace(`/memories${search.toString() ? `?${search}` : ''}`, {
      scroll: false
    });
    return () => clearTimeout(timeout);
  }, [highlightId, memories, router]);

  useEffect(() => {
    if (!editingMemory) return;
    setDraftDiary(editingMemory.diary);
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
      keywords: draftKeywords.trim() || undefined
    });
    setEditingId(null);
  };

  const daysText = useMemo(() => {
    if (!stats.total) return '还没有记录，今天就开始吧！';
    return `已记录 ${stats.total} 个闪光日子 · 一起走过的第 ${stats.daysTogether} 天`;
  }, [stats]);

  return (
    <main className="flex min-h-screen flex-col gap-10 px-6 py-16">
      <header className="mx-auto w-full max-w-4xl text-center">
        <h1 className="font-script text-4xl text-memory-text sm:text-5xl">
          我们的成长手账 📖
        </h1>
        <p className="mt-4 text-base font-accent text-memory-muted">{daysText}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="font-button rounded-xl bg-memory-coral px-5 py-3 text-sm font-semibold text-white transition hover:bg-memory-coral/90"
          >
            添加今天的闪光时刻
          </Link>
        </div>
      </header>

      {!isReady && (
        <p className="text-center text-sm font-sans text-memory-muted/80">
          正在为你打开手账页面，请稍候…
        </p>
      )}

      {isReady && memories.length === 0 && (
        <section className="mx-auto flex w-full max-w-4xl flex-col items-center gap-4 rounded-3xl border border-memory-coral/25 bg-white/85 p-10 text-center shadow-memory-card">
          <p className="font-script text-lg leading-[1.8] text-memory-text">手账还空着，去记录第一束闪光吧 ✨</p>
          <Link
            href="/"
            className="font-button rounded-xl border border-memory-coral/30 bg-memory-paper px-4 py-2 text-sm font-medium text-memory-muted transition hover:bg-white"
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
              className="group grid gap-4 rounded-3xl border border-memory-coral/25 bg-white/90 p-6 shadow-memory-card transition hover:shadow-lg md:grid-cols-[160px_1fr]"
            >
              <div className="relative overflow-hidden rounded-2xl bg-memory-paper/70 shadow-memory-card">
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
                  <p className="font-script text-base leading-relaxed text-memory-text">
                    {memory.diary}
                  </p>
                  <div className="text-xs font-accent text-memory-muted">
                    <span>
                      记录于 {new Date(memory.createdAt).toLocaleDateString('zh-CN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                    {memory.nickname && <span> · {memory.nickname}</span>}
                    {memory.age && <span> · {memory.age}</span>}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleOpenEditor(memory.id)}
                    className="font-button rounded-xl border border-memory-coral/30 bg-white px-4 py-2 text-sm font-medium text-memory-muted transition hover:bg-memory-paper/70"
                  >
                    轻轻改一改
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push(`/share?memoryId=${memory.id}`)}
                    className="font-button rounded-xl bg-memory-coral px-4 py-2 text-sm font-semibold text-white transition hover:bg-memory-coral/90"
                  >
                    寄明信片
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTargetId(memory.id)}
                    className="font-button rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-500 transition hover:bg-red-50"
                  >
                    删除
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
            className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-3xl border border-memory-coral/30 bg-white p-6 shadow-memory-card"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="space-y-2">
              <h2 className="font-script text-xl text-memory-text">轻轻改一改</h2>
              <p className="text-xs font-sans text-memory-muted">
                调整文字，保留这份温柔记忆。
              </p>
              {(editingMemory.nickname || editingMemory.age) && (
                <p className="text-xs font-sans text-memory-muted/80">
                  {editingMemory.nickname ?? '宝贝'}
                  {editingMemory.age ? ` · ${editingMemory.age}` : ''}
                </p>
              )}
            </header>

            <label className="space-y-2">
              <span className="text-xs font-medium text-memory-text">成长日记</span>
              <textarea
                value={draftDiary}
                onChange={(event) => setDraftDiary(event.target.value)}
                rows={6}
                maxLength={180}
                className="font-script w-full rounded-xl border border-memory-coral/30 bg-memory-paper/60 px-3 py-3 text-sm leading-relaxed text-memory-text outline-none transition focus:border-memory-coral focus:ring-2 focus:ring-memory-coral/25"
              />
            </label>

            <div className="space-y-1">
              <label className="text-xs font-medium text-memory-text">关键词或事件</label>
              <input
                type="text"
                value={draftKeywords}
                onChange={(event) => setDraftKeywords(event.target.value)}
                maxLength={50}
                className="w-full rounded-xl border border-memory-coral/30 bg-white px-3 py-2 text-sm text-memory-text outline-none transition focus:border-memory-coral focus:ring-2 focus:ring-memory-coral/25"
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="font-button rounded-xl border border-memory-coral/30 bg-white px-4 py-2 text-sm font-medium text-memory-muted transition hover:bg-memory-paper/70"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={!draftDiary.trim()}
                className="font-button rounded-xl bg-memory-coral px-5 py-2 text-sm font-semibold text-white transition hover:bg-memory-coral/90 disabled:cursor-not-allowed disabled:bg-memory-coral/60"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTargetId && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4 py-10 backdrop-blur-sm" onClick={() => setDeleteTargetId(null)}>
          <div
            className="w-full max-w-sm space-y-4 rounded-3xl border border-red-200 bg-white p-6 text-center shadow-memory-card"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="font-script text-lg text-memory-text">确定要删掉这段记忆吗？</h2>
            <p className="text-sm font-sans text-memory-muted">
              删除后无法恢复，可以先导出明信片再决定。
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                className="font-button rounded-xl border border-memory-coral/30 bg-white px-4 py-2 text-sm font-medium text-memory-muted transition hover:bg-memory-paper/70"
              >
                先留着
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteMemory(deleteTargetId);
                  setDeleteTargetId(null);
                }}
                className="font-button rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

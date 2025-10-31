'use client';

import html2canvas from 'html2canvas';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMemories } from '@/hooks/use-memories';

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export default function SharePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const memoryId = searchParams.get('memoryId');
  const cardRef = useRef<HTMLDivElement | null>(null);

  const { memories, isReady } = useMemories();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);

  const memory = useMemo(
    () => memories.find((item) => item.id === memoryId) ?? null,
    [memories, memoryId]
  );

  useEffect(() => {
    if (!isReady) return;
    if (!memoryId || !memory) {
      router.replace('/memories?error=not-found');
    }
  }, [isReady, memory, memoryId, router]);

  useEffect(() => {
    if (!memory) return;
    const img = new window.Image();
    img.src = memory.photoDataUrl;
    img.onload = () => {
      if (img.naturalHeight > 0) {
        setImageAspectRatio(img.naturalWidth / img.naturalHeight);
      }
    };
  }, [memory]);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    try {
      setIsDownloading(true);
      setStatusMessage(null);
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#FDF8F3',
        scale: 2,
        useCORS: true,
        imageTimeout: 0
      });
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      const dateLabel = memory ? formatDate(memory.createdAt).replace(/\s+/g, '') : 'memory';
      link.download = `memory-box-${dateLabel}.png`;
      link.click();
      setStatusMessage('已为你生成明信片，记得分享给家人喔。');
    } catch (error) {
      console.error('[share] download failed', error);
      setStatusMessage('明信片有点害羞，稍后再试一次吧。');
    } finally {
      setIsDownloading(false);
    }
  };

  if (!memory) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <p className="text-base font-sans text-memory-muted">正在为你寻找这段记忆…</p>
        <Link
          href="/memories"
          className="font-button rounded-xl border border-memory-coral/30 bg-white px-4 py-2 text-sm font-medium text-memory-muted transition hover:bg-memory-paper/70"
        >
          返回成长手账
        </Link>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center gap-10 px-6 py-16">
      <header className="text-center">
        <h1 className="font-script text-4xl text-memory-text sm:text-5xl">
          寄给未来的我们 💌
        </h1>
        <p className="mt-4 text-sm font-sans text-memory-muted">
          把这张闪光时刻装进明信片，下载后随时分享给家人。
        </p>
      </header>

      <div
        ref={cardRef}
        className="w-full max-w-md rounded-[32px] border border-memory-coral/30 bg-gradient-to-br from-memory-paper to-white p-6 shadow-memory-card"
      >
        <div className="flex h-full flex-col gap-5 rounded-3xl bg-white/85 p-5">
          <div className="relative overflow-hidden rounded-2xl border border-memory-coral/25 shadow-memory-card">
            <div
              className="relative w-full"
              style={{ aspectRatio: imageAspectRatio ?? 4 / 3 }}
            >
              <Image
                src={memory.photoDataUrl}
                alt="闪光时刻"
                fill
                className="rounded-2xl object-cover"
                sizes="(min-width: 768px) 384px, 100vw"
                unoptimized
              />
            </div>
          </div>

          <div className="font-script flex-1 whitespace-pre-line text-left text-base leading-relaxed text-memory-text">
            {memory.diary}
          </div>

          <div className="mt-auto space-y-1 text-left text-xs font-accent text-memory-muted">
            <p>{formatDate(memory.createdAt)}</p>
            {memory.age && <p>记录时约 {memory.age}</p>}
            <p className="font-signature text-lg text-memory-text">
              写给 {memory.nickname ? `${memory.nickname} 的家人` : '未来的我们'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-4">
        <button
          type="button"
          onClick={handleDownload}
          disabled={isDownloading}
          className="font-button rounded-xl bg-memory-coral px-5 py-3 text-sm font-semibold text-white transition hover:bg-memory-coral/90 disabled:cursor-not-allowed disabled:bg-memory-coral/60"
        >
          {isDownloading ? '生成中…' : '寄给未来的我们'}
        </button>
        <Link
          href="/memories"
          className="font-button rounded-xl border border-memory-coral/30 bg-white px-4 py-2 text-sm font-medium text-memory-muted transition hover:bg-memory-paper/70"
        >
          返回成长手账
        </Link>
      </div>

      {statusMessage && (
        <p className="text-sm font-sans text-memory-muted">{statusMessage}</p>
      )}
    </main>
  );
}

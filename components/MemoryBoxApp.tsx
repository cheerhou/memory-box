'use client';

import NextImage from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useRef, useState } from 'react';
import { STORAGE_QUOTA_ERROR_CODE, useMemories } from '@/hooks/use-memories';

type ViewState = 'intro' | 'upload' | 'generating' | 'editing';

type GenerateResponse = {
  diary: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
};

function formatError(message: unknown) {
  if (typeof message === 'string') return message;
  if (message instanceof Error) return message.message;
  return '发生未知错误，请稍后重试。';
}

async function fileToDataUrl(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('读取文件失败'));
    reader.readAsDataURL(file);
  });
}

async function loadImage(dataUrl: string) {
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = dataUrl;
  });
}

async function compressImage(file: File) {
  const dataUrl = await fileToDataUrl(file);
  const image = await loadImage(dataUrl);

  const maxEdge = 1280;
  const longestEdge = Math.max(image.width, image.height) || 1;
  const scale = Math.min(1, maxEdge / longestEdge);
  const width = Math.round(image.width * scale);
  const height = Math.round(image.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('暂时无法处理这张照片，请稍后再试。');
  }
  context.drawImage(image, 0, 0, width, height);

  return canvas.toDataURL('image/jpeg', 0.82);
}

export function MemoryBoxApp() {
  const router = useRouter();
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const { addMemory, isReady } = useMemories();

  const [view, setView] = useState<ViewState>('intro');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [diary, setDiary] = useState('');
  const [nickname, setNickname] = useState('');
  const [age, setAge] = useState('');
  const [keywords, setKeywords] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<GenerateResponse['usage']>();
  const [hasCopied, setHasCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const resetSession = useCallback(() => {
    setPhotoDataUrl(null);
    setDiary('');
    setUsage(undefined);
    setHasCopied(false);
    setError(null);
  }, []);

  const openFileDialog = useCallback(() => {
    requestAnimationFrame(() => {
      uploadInputRef.current?.click();
    });
  }, []);

  const handleStartRecording = useCallback(() => {
    setView('upload');
    setTimeout(() => {
      openFileDialog();
    }, 120);
  }, [openFileDialog]);

  const triggerGeneration = useCallback(
    async (file: File) => {
      setError(null);
      setView('generating');
      setHasCopied(false);
      setDiary('');
      setUsage(undefined);

      const formData = new FormData();
      formData.append('photo', file);
      if (nickname.trim()) formData.append('childNickname', nickname.trim());
      if (age.trim()) formData.append('childAge', age.trim());
      if (keywords.trim()) formData.append('recentKeywords', keywords.trim());

      try {
        const response = await fetch('/api/generate', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || '唔…这张照片有点害羞，能再换一张吗？');
        }

        const data: GenerateResponse = await response.json();
        setDiary(data.diary);
        setUsage(data.usage);
        setView('editing');
      } catch (err) {
        setError(formatError(err));
        setView('upload');
      }
    },
    [age, keywords, nickname]
  );

  const handlePhotoChange = useCallback(
    async (fileList: FileList | null) => {
      const file = fileList?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        setError('仅支持上传 JPG 或 PNG 图片。');
        return;
      }

      try {
        const dataUrl = await compressImage(file);
        setPhotoDataUrl(dataUrl);
        await triggerGeneration(file);
      } catch (err) {
        setError(formatError(err));
      } finally {
        if (uploadInputRef.current) {
          uploadInputRef.current.value = '';
        }
      }
    },
    [triggerGeneration]
  );

  const isDiaryEmpty = useMemo(() => diary.trim().length === 0, [diary]);

  const handleSave = useCallback(async () => {
    if (!photoDataUrl) {
      setError('貌似没有找到这张照片，试着重新上传一次吧。');
      return;
    }
    if (isDiaryEmpty) {
      setError('日记还空着呢，补充几句再收藏吧。');
      return;
    }

    try {
      setIsSaving(true);
      const memory = addMemory({
        diary: diary.trim(),
        photoDataUrl,
        nickname: nickname.trim() || undefined,
        age: age.trim() || undefined,
        keywords: keywords.trim() || undefined
      });
      resetSession();
      setView('intro');
      router.push(`/memories?highlight=${encodeURIComponent(memory.id)}`);
    } catch (err) {
      if (err instanceof Error && err.message === STORAGE_QUOTA_ERROR_CODE) {
        setError('成长手账装不下更多照片了，可以先删除旧记录或压缩图片后再试。');
      } else {
        setError(formatError(err));
      }
    } finally {
      setIsSaving(false);
    }
  }, [addMemory, diary, isDiaryEmpty, nickname, age, keywords, photoDataUrl, resetSession, router]);

  const handleCopy = useCallback(async () => {
    if (!diary) return;
    try {
      await navigator.clipboard.writeText(diary);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000);
    } catch (err) {
      setError('复制失败，请手动复制文字。');
    }
  }, [diary]);

  const handleReset = useCallback(() => {
    resetSession();
    setView('intro');
  }, [resetSession]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
      {view === 'intro' && (
        <section className="space-y-6 rounded-3xl border border-memory-rose/40 bg-white/80 p-10 text-center shadow-sm">
          <h2 className="text-3xl font-semibold text-memory-ink sm:text-4xl">
            留下今天的闪光时刻 ✨
          </h2>
          <p className="text-base leading-relaxed text-memory-ink/75">
            让 AI 帮你把碎碎念变成温柔手账，轻松收藏孩子成长的亮点瞬间。
          </p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={handleStartRecording}
              className="w-full rounded-xl bg-memory-rose px-6 py-3 text-base font-semibold text-white transition hover:bg-memory-rose/90 sm:w-auto"
            >
              添加今天的闪光时刻
            </button>
            <Link
              href="/memories"
              className="text-sm font-medium text-memory-ink/70 transition hover:text-memory-ink"
            >
              或看看我们的成长手账 →
            </Link>
          </div>
        </section>
      )}

      {view !== 'intro' && (
        <section className="space-y-8 rounded-3xl border border-memory-rose/40 bg-white/80 p-8 shadow-sm backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-2xl font-semibold text-memory-ink">
                {view === 'editing' ? '预览并轻轻润色' : '添加今天的闪光时刻'}
              </h3>
              <p className="text-sm text-memory-ink/70">
                {view === 'generating'
                  ? '正在为你写下今天的温柔… 🌼'
                  : '上传一张照片，AI 会帮你写下 30–60 字的成长日记。'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-xl border border-memory-rose/40 bg-white px-3 py-2 text-xs font-medium text-memory-ink transition hover:bg-memory-cream"
            >
              重新开始
            </button>
          </div>

          {view === 'upload' && (
            <div className="space-y-6">
              <label
                htmlFor="photo-upload"
                className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-memory-rose/60 bg-memory-cream/60 p-10 text-center text-sm text-memory-ink/70 transition hover:border-memory-rose hover:bg-white"
              >
                <span>点击上传孩子的照片，或拖拽到这里</span>
                <span className="text-xs text-memory-ink/50">支持 JPG / PNG，单张即可</span>
                <input
                  ref={uploadInputRef}
                  id="photo-upload"
                  type="file"
                  accept="image/png,image/jpeg"
                  className="sr-only"
                  onChange={(event) => handlePhotoChange(event.target.files)}
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label htmlFor="nickname" className="text-sm font-medium text-memory-ink/80">
                    孩子昵称（选填）
                  </label>
                  <input
                    id="nickname"
                    type="text"
                    value={nickname}
                    onChange={(event) => setNickname(event.target.value)}
                    maxLength={20}
                    placeholder="例如：小果"
                    className="w-full rounded-xl border border-memory-rose/40 bg-white px-3 py-2 text-memory-ink outline-none transition focus:border-memory-rose focus:ring-2 focus:ring-memory-rose/30"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="age" className="text-sm font-medium text-memory-ink/80">
                    年龄（选填）
                  </label>
                  <input
                    id="age"
                    type="text"
                    value={age}
                    onChange={(event) => setAge(event.target.value)}
                    maxLength={20}
                    placeholder="例如：2 岁半"
                    className="w-full rounded-xl border border-memory-rose/40 bg-white px-3 py-2 text-memory-ink outline-none transition focus:border-memory-rose focus:ring-2 focus:ring-memory-rose/30"
                  />
                </div>

                <div className="sm:col-span-2 space-y-1">
                  <label htmlFor="keywords" className="text-sm font-medium text-memory-ink/80">
                    最近的关键词或事件（选填）
                  </label>
                  <input
                    id="keywords"
                    type="text"
                    value={keywords}
                    onChange={(event) => setKeywords(event.target.value)}
                    maxLength={50}
                    placeholder="例如：第一次画彩虹、准备上幼儿园"
                    className="w-full rounded-xl border border-memory-rose/40 bg-white px-3 py-2 text-memory-ink outline-none transition focus:border-memory-rose focus:ring-2 focus:ring-memory-rose/30"
                  />
                </div>
              </div>
            </div>
          )}

          {view === 'generating' && (
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl bg-memory-cream/70 p-10 text-center text-memory-ink/70">
              <span className="animate-pulse text-sm">正在为你写下今天的温柔… 🌼</span>
              <span className="text-xs text-memory-ink/50">让这段记忆稍等几秒，就会为你盛放。</span>
            </div>
          )}

          {view === 'editing' && (
            <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
              {photoDataUrl && (
                <div className="relative overflow-hidden rounded-2xl border border-memory-rose/30 bg-memory-cream/40">
                  <NextImage
                    src={photoDataUrl}
                    alt="预览"
                    fill
                    className="object-cover"
                    sizes="(min-width: 1024px) 360px, 100vw"
                    priority
                    unoptimized
                  />
                </div>
              )}

              <div className="flex flex-col gap-5">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-memory-ink/80">成长日记</span>
                  <textarea
                    value={diary}
                    onChange={(event) => setDiary(event.target.value)}
                    rows={8}
                    maxLength={120}
                    className="w-full rounded-xl border border-memory-rose/40 bg-white px-3 py-3 text-base leading-relaxed text-memory-ink outline-none transition focus:border-memory-rose focus:ring-2 focus:ring-memory-rose/30"
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label htmlFor="nickname-edit" className="text-xs font-medium text-memory-ink/70">
                      孩子昵称（选填）
                    </label>
                    <input
                      id="nickname-edit"
                      type="text"
                      value={nickname}
                      onChange={(event) => setNickname(event.target.value)}
                      maxLength={20}
                      className="w-full rounded-xl border border-memory-rose/40 bg-white px-3 py-2 text-sm text-memory-ink outline-none transition focus:border-memory-rose focus:ring-2 focus:ring-memory-rose/30"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="age-edit" className="text-xs font-medium text-memory-ink/70">
                      年龄（选填）
                    </label>
                    <input
                      id="age-edit"
                      type="text"
                      value={age}
                      onChange={(event) => setAge(event.target.value)}
                      maxLength={20}
                      className="w-full rounded-xl border border-memory-rose/40 bg-white px-3 py-2 text-sm text-memory-ink outline-none transition focus:border-memory-rose focus:ring-2 focus:ring-memory-rose/30"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <label htmlFor="keywords-edit" className="text-xs font-medium text-memory-ink/70">
                      最近的关键词或事件（选填）
                    </label>
                    <input
                      id="keywords-edit"
                      type="text"
                      value={keywords}
                      onChange={(event) => setKeywords(event.target.value)}
                      maxLength={50}
                      className="w-full rounded-xl border border-memory-rose/40 bg-white px-3 py-2 text-sm text-memory-ink outline-none transition focus:border-memory-rose focus:ring-2 focus:ring-memory-rose/30"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!isReady || isDiaryEmpty || isSaving}
                    className="rounded-xl bg-memory-rose px-5 py-3 text-sm font-semibold text-white transition hover:bg-memory-rose/90 disabled:cursor-not-allowed disabled:bg-memory-rose/60"
                  >
                    {isSaving ? '收藏中…' : '存进我们的成长手账'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCopy}
                    disabled={!diary}
                    className="rounded-xl border border-memory-rose/50 bg-white px-4 py-2 text-sm font-medium text-memory-ink transition hover:bg-memory-cream disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {hasCopied ? '已复制 ✓' : '复制文字'}
                  </button>
                  {usage?.totalTokens !== undefined && (
                    <span className="text-xs text-memory-ink/50">
                      Tokens: {usage.totalTokens}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          {!isReady && (
            <p className="text-center text-xs text-memory-ink/40">
              正在唤醒成长手账，请稍候片刻…
            </p>
          )}
        </section>
      )}
    </div>
  );
}

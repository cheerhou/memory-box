'use client';

import { useEffect, useMemo, useState } from 'react';

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

export function MemoryBoxApp() {
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [nickname, setNickname] = useState('');
  const [age, setAge] = useState('');
  const [keywords, setKeywords] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [diary, setDiary] = useState<string | null>(null);
  const [usage, setUsage] = useState<GenerateResponse['usage']>();
  const [error, setError] = useState<string | null>(null);
  const [hasCopied, setHasCopied] = useState(false);

  useEffect(() => {
    if (!previewUrl) return;
    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const canSubmit = useMemo(() => !!photoFile && !isLoading, [photoFile, isLoading]);

  const handlePhotoChange = (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) {
      setPhotoFile(null);
      setPreviewUrl(null);
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('仅支持上传 JPG 或 PNG 图片。');
      setPhotoFile(null);
      setPreviewUrl(null);
      return;
    }

    setError(null);
    setPhotoFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!photoFile) {
      setError('请先选择一张照片。');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setDiary(null);
      setUsage(undefined);
      setHasCopied(false);

      const formData = new FormData();
      formData.append('photo', photoFile);
      if (nickname.trim()) formData.append('childNickname', nickname.trim());
      if (age.trim()) formData.append('childAge', age.trim());
      if (keywords.trim()) formData.append('recentKeywords', keywords.trim());

      const response = await fetch('/api/generate', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || '生成失败，请稍后再试。');
      }

      const data: GenerateResponse = await response.json();
      setDiary(data.diary);
      setUsage(data.usage);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!diary) return;
    try {
      await navigator.clipboard.writeText(diary);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000);
    } catch (err) {
      setError('复制失败，请手动复制文字。');
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 sm:flex-row">
      <section className="flex-1 space-y-6 rounded-3xl border border-memory-rose/40 bg-white/70 p-6 shadow-sm backdrop-blur">
        <header className="space-y-2">
          <h2 className="text-2xl font-semibold text-memory-ink">
            添加闪光时刻 ✨
          </h2>
          <p className="text-sm text-memory-ink/70">
            上传一张 JPG 或 PNG 照片，几秒内获得一段暖心记录。
          </p>
        </header>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="photo-upload"
              className="block cursor-pointer rounded-2xl border-2 border-dashed border-memory-rose/60 bg-memory-cream/60 p-6 text-center text-sm text-memory-ink/70 transition hover:border-memory-rose hover:bg-white"
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="预览"
                  className="mx-auto h-48 w-full rounded-2xl object-cover"
                />
              ) : (
                <span>点击或拖拽上传孩子的照片（单张）</span>
              )}
              <input
                id="photo-upload"
                type="file"
                accept="image/png,image/jpeg"
                className="sr-only"
                onChange={(event) => handlePhotoChange(event.target.files)}
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="nickname" className="text-sm font-medium text-memory-ink/80">
                孩子昵称
              </label>
              <input
                id="nickname"
                type="text"
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                maxLength={20}
                placeholder="例如：小果"
                className="w-full rounded-xl border border-memory-rose/40 bg-white px-3 py-2 text-memory-ink outline-none transition focus:border-memory-rose focus:ring-2 focus:ring-memory-rose/40"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="age" className="text-sm font-medium text-memory-ink/80">
                年龄
              </label>
              <input
                id="age"
                type="text"
                value={age}
                onChange={(event) => setAge(event.target.value)}
                maxLength={20}
                placeholder="例如：2 岁半"
                className="w-full rounded-xl border border-memory-rose/40 bg-white px-3 py-2 text-memory-ink outline-none transition focus:border-memory-rose focus:ring-2 focus:ring-memory-rose/40"
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <label htmlFor="keywords" className="text-sm font-medium text-memory-ink/80">
                最近的关键词或事件
              </label>
              <input
                id="keywords"
                type="text"
                value={keywords}
                onChange={(event) => setKeywords(event.target.value)}
                maxLength={50}
                placeholder="例如：第一次画彩虹、准备上幼儿园"
                className="w-full rounded-xl border border-memory-rose/40 bg-white px-3 py-2 text-memory-ink outline-none transition focus:border-memory-rose focus:ring-2 focus:ring-memory-rose/40"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-xl bg-memory-rose px-4 py-3 text-base font-semibold text-white transition hover:bg-memory-rose/90 disabled:cursor-not-allowed disabled:bg-memory-rose/60"
          >
            {isLoading ? '生成中…' : '生成成长日记'}
          </button>
        </form>

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        )}
      </section>

      <section className="flex-1 space-y-4 rounded-3xl border border-memory-rose/40 bg-white/80 p-6 shadow-sm backdrop-blur">
        <header className="space-y-2">
          <h2 className="text-2xl font-semibold text-memory-ink">
            AI 成长日记
          </h2>
          <p className="text-sm text-memory-ink/70">
            注意查验生成内容是否符合真实记忆，再分享给家人。
          </p>
        </header>

        <div className="min-h-[220px] rounded-2xl bg-memory-cream/80 p-4 text-left text-base leading-relaxed text-memory-ink shadow-inner">
          {isLoading && <p>AI 正在编织这段记忆，请稍候…</p>}
          {!isLoading && diary && <p>{diary}</p>}
          {!isLoading && !diary && (
            <p className="text-memory-ink/60">
              生成的文案将出现在这里。试着先上传一张照片吧。
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleCopy}
            disabled={!diary}
            className="rounded-xl border border-memory-rose/70 bg-white px-4 py-2 text-sm font-medium text-memory-ink transition hover:bg-memory-rose/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {hasCopied ? '已复制 ✓' : '复制文案'}
          </button>

          {usage?.totalTokens !== undefined && (
            <span className="text-xs text-memory-ink/50">
              Tokens: {usage.totalTokens}
            </span>
          )}
        </div>
      </section>
    </div>
  );
}

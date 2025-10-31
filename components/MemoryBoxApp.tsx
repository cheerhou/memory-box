'use client';

import NextImage from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { STORAGE_QUOTA_ERROR_CODE, useMemories } from '@/hooks/use-memories';
import { useProfile } from '@/hooks/use-profile';
import { calculateAgeLabel } from '@/lib/profile';

type ViewState = 'intro' | 'upload' | 'preparing' | 'generating' | 'editing';

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
  const { profile, isReady: isProfileReady, saveProfile } = useProfile();

  const [view, setView] = useState<ViewState>('intro');
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [diary, setDiary] = useState('');
  const [keywords, setKeywords] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<GenerateResponse['usage']>();
  const [hasCopied, setHasCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isProfileModalOpen, setProfileModalOpen] = useState(false);
  const [pendingStart, setPendingStart] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const agePreview = useMemo(() => {
    if (!profile) return null;
    const label = calculateAgeLabel(profile.birthdate);
    return label || '成长中的小宝贝';
  }, [profile]);

  const resetSession = useCallback(() => {
    setPhotoDataUrl(null);
    setDiary('');
    setUsage(undefined);
    setHasCopied(false);
    setError(null);
    setKeywords('');
    setSelectedFile(null);
  }, []);

  useEffect(() => {
    if (isProfileReady && !profile) {
      setProfileModalOpen(true);
    }
  }, [isProfileReady, profile]);

  const openFileDialog = useCallback(() => {
    requestAnimationFrame(() => {
      uploadInputRef.current?.click();
    });
  }, []);

  const startRecordingFlow = useCallback(() => {
    setView('upload');
    setTimeout(() => {
      openFileDialog();
    }, 120);
  }, [openFileDialog]);

  const handleStartRecording = useCallback(() => {
    if (!profile) {
      setPendingStart(true);
      setProfileModalOpen(true);
      return;
    }
    resetSession();
    startRecordingFlow();
  }, [profile, resetSession, startRecordingFlow]);

  const triggerGeneration = useCallback(
    async (file: File) => {
      setError(null);
      setView('generating');
      setHasCopied(false);
      setDiary('');
      setUsage(undefined);

      const formData = new FormData();
      formData.append('photo', file);
      const currentNickname = profile?.nickname?.trim();
      if (currentNickname) formData.append('childNickname', currentNickname);
      const ageLabel = profile ? calculateAgeLabel(profile.birthdate, new Date()) : '';
      if (ageLabel) formData.append('childAge', ageLabel);
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
    [keywords, profile]
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
        setError(null);
        setHasCopied(false);
        setUsage(undefined);
        setDiary('');
        setPhotoDataUrl(dataUrl);
        setSelectedFile(file);
        setView('preparing');
      } catch (err) {
        setError(formatError(err));
      } finally {
        if (uploadInputRef.current) {
          uploadInputRef.current.value = '';
        }
      }
    },
    []
  );

  const isDiaryEmpty = useMemo(() => diary.trim().length === 0, [diary]);

  const handleGenerateClick = useCallback(() => {
    if (!selectedFile) {
      setError('请先选择一张照片。');
      return;
    }
    triggerGeneration(selectedFile);
  }, [selectedFile, triggerGeneration]);

  const handleSave = useCallback(async () => {
    if (!profile) {
      setError('请先补充孩子的信息，再来记录闪光时刻。');
      setProfileModalOpen(true);
      return;
    }
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
      const ageSnapshot = calculateAgeLabel(profile.birthdate, new Date()) || undefined;
      const memory = addMemory({
        diary: diary.trim(),
        photoDataUrl,
        nickname: profile.nickname,
        age: ageSnapshot,
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
  }, [addMemory, diary, isDiaryEmpty, keywords, photoDataUrl, profile, resetSession, router]);

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

  const handleProfileModalClose = useCallback(() => {
    if (!profile) return;
    setProfileModalOpen(false);
  }, [profile]);

  const handleProfileSubmit = useCallback(
    (input: { nickname: string; birthdate: string }) => {
      saveProfile(input);
      setProfileModalOpen(false);
      if (pendingStart) {
        setPendingStart(false);
        setTimeout(() => {
          startRecordingFlow();
        }, 120);
      }
    },
    [pendingStart, saveProfile, startRecordingFlow]
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
      <input
        ref={uploadInputRef}
        id="photo-upload-hidden"
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={(event) => handlePhotoChange(event.target.files)}
      />
      {isProfileModalOpen && (
        <ProfileModal
          onClose={handleProfileModalClose}
          onSubmit={handleProfileSubmit}
          defaultNickname={profile?.nickname}
          defaultBirthdate={profile?.birthdate}
          isProfileReady={isProfileReady}
        />
      )}

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
                  : profile && agePreview
                  ? `${profile.nickname} 现在约 ${agePreview}，告诉我们最近发生了什么吧。`
                  : '上传前先填写孩子的昵称和生日，我们会帮你记录年龄。'}
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
                htmlFor="photo-upload-hidden"
                className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-memory-rose/60 bg-memory-cream/60 p-10 text-center text-sm text-memory-ink/70 transition hover:border-memory-rose hover:bg-white"
              >
                <span>点击上传孩子的照片，或拖拽到这里</span>
                <span className="text-xs text-memory-ink/50">支持 JPG / PNG，单张即可</span>
              </label>

              <div className="space-y-1">
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
          )}

          {view === 'generating' && (
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl bg-memory-cream/70 p-10 text-center text-memory-ink/70">
              <span className="animate-pulse text-sm">正在为你写下今天的温柔… 🌼</span>
              <span className="text-xs text-memory-ink/50">让这段记忆稍等几秒，就会为你盛放。</span>
            </div>
          )}

          {view === 'preparing' && (
            <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
              {photoDataUrl ? (
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
              ) : (
                <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-dashed border-memory-rose/40 bg-memory-cream/40 text-sm text-memory-ink/60">
                  等待你的照片上传…
                </div>
              )}

              <div className="flex flex-col gap-4">
                <p className="text-sm text-memory-ink/70">
                  想提醒的关键词或小故事可以先写下，再点击下方按钮生成文案。
                </p>
                <label htmlFor="keywords-pre" className="space-y-2">
                  <span className="text-xs font-medium text-memory-ink/70">最近的关键词或事件（选填）</span>
                  <input
                    id="keywords-pre"
                    type="text"
                    value={keywords}
                    onChange={(event) => setKeywords(event.target.value)}
                    maxLength={50}
                    className="w-full rounded-xl border border-memory-rose/40 bg-white px-3 py-2 text-sm text-memory-ink outline-none transition focus:border-memory-rose focus:ring-2 focus:ring-memory-rose/30"
                    placeholder="例如：第一次画彩虹、准备上幼儿园"
                  />
                </label>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleGenerateClick}
                    disabled={!selectedFile}
                    className="rounded-xl bg-memory-rose px-5 py-3 text-sm font-semibold text-white transition hover:bg-memory-rose/90 disabled:cursor-not-allowed disabled:bg-memory-rose/60"
                  >
                    开始生成成长日记
                  </button>
                  <label
                    htmlFor="photo-upload-hidden"
                    className="cursor-pointer rounded-xl border border-memory-rose/40 bg-white px-4 py-2 text-xs font-medium text-memory-ink transition hover:bg-memory-cream"
                  >
                    换一张照片
                  </label>
                </div>
              </div>
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

                <div className="space-y-1">
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

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!isReady || !isProfileReady || isDiaryEmpty || isSaving}
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
                    <span className="text-xs text-memory-ink/50">Tokens: {usage.totalTokens}</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          {(!isReady || !isProfileReady) && (
            <p className="text-center text-xs text-memory-ink/40">正在唤醒成长手账，请稍候片刻…</p>
          )}
        </section>
      )}
    </div>
  );
}

type ProfileModalProps = {
  onClose: () => void;
  onSubmit: (input: { nickname: string; birthdate: string }) => void;
  defaultNickname?: string;
  defaultBirthdate?: string;
  isProfileReady: boolean;
};

function ProfileModal({ onClose, onSubmit, defaultNickname = '', defaultBirthdate = '', isProfileReady }: ProfileModalProps) {
  const [nickname, setNickname] = useState(defaultNickname);
  const [birthdate, setBirthdate] = useState(defaultBirthdate);
  const [error, setError] = useState<string | null>(null);

  const canSkip = Boolean(defaultNickname && defaultBirthdate);

  useEffect(() => {
    setNickname(defaultNickname);
    setBirthdate(defaultBirthdate);
  }, [defaultNickname, defaultBirthdate]);

  if (!isProfileReady) {
    return null;
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = nickname.trim();
    if (!trimmed) {
      setError('给孩子一个温柔的称呼吧。');
      return;
    }
    if (!birthdate) {
      setError('请选择生日，这样我们才能计算年龄。');
      return;
    }
    try {
      onSubmit({ nickname: trimmed, birthdate });
    } catch (err) {
      setError(formatError(err));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-10 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md space-y-6 rounded-3xl border border-memory-rose/40 bg-white p-8 shadow-2xl"
      >
        <header className="space-y-2 text-center">
          <h2 className="text-2xl font-semibold text-memory-ink">先认识一下小主角吧</h2>
          <p className="text-sm text-memory-ink/60">我们会记住这些信息，帮你自动填写每次的日记。</p>
        </header>

        <div className="space-y-4">
          <label className="space-y-2">
            <span className="text-sm font-medium text-memory-ink/80">孩子昵称</span>
            <input
              type="text"
              value={nickname}
              onChange={(event) => {
                setNickname(event.target.value);
                setError(null);
              }}
              maxLength={20}
              placeholder="例如：小果"
              className="w-full rounded-xl border border-memory-rose/40 bg-white px-3 py-2 text-memory-ink outline-none transition focus:border-memory-rose focus:ring-2 focus:ring-memory-rose/30"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-memory-ink/80">出生日期</span>
            <input
              type="date"
              value={birthdate}
              onChange={(event) => {
                setBirthdate(event.target.value);
                setError(null);
              }}
              className="w-full rounded-xl border border-memory-rose/40 bg-white px-3 py-2 text-memory-ink outline-none transition focus:border-memory-rose focus:ring-2 focus:ring-memory-rose/30"
            />
          </label>
        </div>

        {birthdate && (
          <p className="text-center text-xs text-memory-ink/60">
            今天的 {nickname || '宝贝'} 大约 {calculateAgeLabel(birthdate)}
          </p>
        )}

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={canSkip ? onClose : undefined}
            disabled={!canSkip}
            className="rounded-xl border border-memory-rose/40 bg-white px-4 py-2 text-sm font-medium text-memory-ink transition hover:bg-memory-cream disabled:cursor-not-allowed disabled:opacity-60"
          >
            稍后填写
          </button>
          <button
            type="submit"
            className="rounded-xl bg-memory-rose px-5 py-2 text-sm font-semibold text-white transition hover:bg-memory-rose/90"
          >
            保存信息
          </button>
        </div>
      </form>
    </div>
  );
}

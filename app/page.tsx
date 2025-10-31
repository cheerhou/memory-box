import { MemoryBoxApp } from "@/components/MemoryBoxApp";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center gap-12 px-6 py-16">
      <section className="mx-auto max-w-2xl space-y-6 text-center">
        <h1 className="text-4xl font-semibold text-memory-ink sm:text-5xl">
          家庭数字记忆盒
        </h1>
        <p className="text-lg text-memory-ink/80">
          每个平凡的日子，都是孩子未来的宝藏。
          <br className="hidden sm:block" />上传一张孩子的照片，让 AI 成为你记录成长故事的好帮手。
        </p>
      </section>

      <MemoryBoxApp />
    </main>
  );
}

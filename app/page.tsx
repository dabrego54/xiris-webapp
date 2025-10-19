import LoginRegisterPanel from "@/components/auth/LoginRegisterPanel"

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f5f1ff] text-ink">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(124,58,237,0.18),_transparent_60%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-24 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,_rgba(124,58,237,0.2),_transparent_70%)] blur-3xl"
        aria-hidden
      />

      <div className="relative z-10 flex w-full max-w-xl flex-col items-center gap-10 px-6 py-16 sm:px-10">
        <div className="flex flex-col items-center gap-3 text-center text-brand">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/80 text-brand shadow-[0_18px_45px_rgba(124,58,237,0.18)]">
            <span className="text-2xl font-bold">x</span>
          </div>
          <span className="text-3xl font-semibold tracking-tight">iris</span>
        </div>

        <LoginRegisterPanel />
      </div>
    </main>
  )
}

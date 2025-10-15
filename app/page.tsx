import LoginRegisterPanel from "@/components/auth/LoginRegisterPanel"

export default function HomePage() {
  return (
    <main className="grid min-h-screen grid-cols-1 bg-[#f6f3ff] text-ink lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-white lg:flex">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[radial-gradient(circle_at_center,_rgba(124,58,237,0.55),_rgba(199,181,254,0.05))] blur-3xl" />
        <div className="absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(124,58,237,0.18),_transparent_65%)] blur-2xl" />
        <div className="absolute inset-x-0 bottom-[-10%] h-64 bg-[radial-gradient(circle_at_top,_rgba(124,58,237,0.2),_transparent_60%)]" />

        <div className="relative z-10 flex w-full flex-col justify-between px-16 pb-16 pt-14 text-[#7c3aed]">
          <header className="space-y-8">
            <div className="flex items-center gap-3 text-3xl font-semibold tracking-tight text-[#7c3aed]">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(124,58,237,0.1)] text-[#7c3aed]">
                <span className="text-2xl font-bold">x</span>
              </div>
              iris
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl font-semibold leading-tight text-ink">
                Conecta con técnicos expertos en minutos
              </h1>
              <p className="max-w-sm text-base text-muted-foreground">
                Gestiona solicitudes, agenda visitas y recibe soporte especializado desde una sola plataforma.
              </p>
            </div>
          </header>

          <footer className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-muted-foreground">
            <span>VeData Group</span>
            <span>2024</span>
          </footer>
        </div>
      </section>

      <section className="relative flex items-center justify-center px-6 py-16 lg:px-16">
        <div className="absolute left-12 top-12 hidden items-center gap-3 text-lg font-semibold text-[#7c3aed] lg:flex">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/60 text-[#7c3aed]">
            <span className="text-xl font-bold">x</span>
          </div>
          iris
        </div>

        <LoginRegisterPanel />
      </section>
    </main>
  )
}

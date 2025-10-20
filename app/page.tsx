import Link from "next/link"
import {
  ArrowRight,
  CheckCircle2,
  Globe2,
  LineChart,
  ShieldCheck,
  Sparkles,
  Smartphone,
  Users,
} from "lucide-react"

const navLinks = [
  { label: "Soluciones", href: "#soluciones" },
  { label: "Beneficios", href: "#beneficios" },
  { label: "Cómo funciona", href: "#como-funciona" },
  { label: "Recursos", href: "#recursos" },
]

const solutions = [
  {
    icon: Smartphone,
    title: "Aplicación intuitiva",
    description:
      "Gestiona operaciones, solicitudes y comunicación desde un único panel diseñado para equipos en movimiento.",
  },
  {
    icon: ShieldCheck,
    title: "Seguridad avanzada",
    description:
      "Protección de datos con estándares empresariales, permisos granulares y monitoreo en tiempo real de incidentes.",
  },
  {
    icon: LineChart,
    title: "Analítica predictiva",
    description:
      "Anticipa necesidades con dashboards dinámicos, métricas accionables y recomendaciones basadas en IA.",
  },
]

const benefits = [
  {
    title: "99.9%",
    subtitle: "Disponibilidad garantizada",
    description: "Infraestructura resiliente y redundante para que tu equipo nunca se detenga.",
  },
  {
    title: "24/7",
    subtitle: "Soporte humano",
    description: "Especialistas listos para ayudarte en cualquier zona horaria y canal.",
  },
  {
    title: "+40%",
    subtitle: "Productividad",
    description: "Procesos optimizados que reducen el tiempo de respuesta y mejoran la satisfacción.",
  },
]

const steps = [
  {
    title: "Crea tu cuenta",
    description:
      "Regístrate en minutos y personaliza la plataforma para reflejar los flujos de tu organización.",
  },
  {
    title: "Conecta a tu equipo",
    description:
      "Invita a colaboradores, define roles y sincroniza herramientas para centralizar la operación.",
  },
  {
    title: "Escala sin límites",
    description:
      "Monitorea métricas clave, automatiza tareas y ofrece experiencias memorables a tus usuarios.",
  },
]

const resources = [
  {
    title: "Historias de clientes",
    description: "Descubre cómo empresas líderes transforman su servicio con Xiris.",
    action: "Ver casos de éxito",
  },
  {
    title: "Centro de recursos",
    description: "Guías, webinars y plantillas para acelerar tu implementación.",
    action: "Explorar biblioteca",
  },
  {
    title: "Programa de partners",
    description: "Conecta con especialistas certificados y amplía tus capacidades.",
    action: "Unirme al programa",
  },
]

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f5f1ff] text-ink">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(124,58,237,0.18),_transparent_60%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-32 left-1/2 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,_rgba(124,58,237,0.18),_transparent_70%)] blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-20 top-48 h-64 w-64 rounded-full bg-[radial-gradient(circle,_rgba(59,130,246,0.12),_transparent_60%)] blur-3xl"
        aria-hidden
      />

      <div className="relative z-10 flex min-h-screen flex-col">
        <header className="sticky top-0 z-20 border-b border-white/40 bg-white/80 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
            <Link href="/" className="flex items-center gap-2 text-brand">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand text-lg font-bold text-white shadow-[0_18px_45px_rgba(124,58,237,0.35)]">
                x
              </span>
              <span className="text-xl font-semibold tracking-tight text-ink">iris</span>
            </Link>

            <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href} className="transition-colors hover:text-brand">
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <div className="hidden items-center rounded-full border border-border bg-white px-1 py-1 text-xs font-semibold text-muted-foreground sm:flex">
                <button
                  type="button"
                  className="rounded-full bg-brand px-3 py-1 text-white shadow-[0_10px_30px_rgba(124,58,237,0.25)]"
                  aria-pressed="true"
                >
                  ES
                </button>
                <button type="button" className="px-3 py-1">
                  EN
                </button>
              </div>
              <Link
                href="/login"
                className="hidden rounded-full border border-transparent bg-transparent px-4 py-2 text-sm font-semibold text-ink transition hover:text-brand md:block"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/registro"
                className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-[0_15px_35px_rgba(124,58,237,0.3)] transition hover:bg-[#6d28d9]"
              >
                Crear cuenta
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-24 px-6 py-16 sm:py-20">
          <section className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="space-y-8">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-brand shadow-sm">
                <Sparkles className="h-4 w-4" />
                La nueva era del soporte inteligente
              </span>
              <h1 className="text-4xl font-semibold leading-tight text-ink sm:text-5xl lg:text-6xl">
                Centraliza tu operación y sorprende a cada usuario en cada interacción.
              </h1>
              <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
                Xiris reúne herramientas de automatización, analítica y colaboración para que tus equipos respondan rápido,
                con contexto y con experiencias memorables desde el primer contacto.
              </p>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <Link
                  href="/registro"
                  className="inline-flex items-center justify-center rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-[0_20px_45px_rgba(124,58,237,0.35)] transition hover:bg-[#6d28d9]"
                >
                  Comenzar gratis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-full border border-border bg-white px-6 py-3 text-sm font-semibold text-ink transition hover:border-brand hover:text-brand"
                >
                  Ya tengo cuenta
                </Link>
              </div>

              <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-brand" />
                  Integraciones nativas
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-brand" />
                  Escalabilidad global
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-brand" />
                  Implementación guiada
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 -translate-y-6 rounded-3xl bg-gradient-to-br from-white/90 via-white/50 to-transparent shadow-[0_35px_80px_rgba(15,23,42,0.12)]" aria-hidden />
              <div className="relative overflow-hidden rounded-3xl border border-white/50 bg-white/80 p-8 backdrop-blur">
                <div className="flex items-center justify-between text-sm font-semibold text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <Globe2 className="h-4 w-4 text-brand" />
                    Panel en tiempo real
                  </span>
                  <span className="rounded-full bg-brand/10 px-3 py-1 text-xs text-brand">Modo live</span>
                </div>
                <div className="mt-6 space-y-5">
                  <div className="rounded-2xl bg-brand/10 p-4">
                    <p className="text-sm font-medium text-brand">Alertas prioritarias</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Notifica automáticamente a los especialistas adecuados cuando se detectan incidencias críticas.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-dashed border-border/60 p-4">
                    <p className="text-sm font-semibold text-ink">Experiencia del usuario</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      "Pasamos de tiempos de respuesta de horas a minutos. El equipo ahora colabora con contexto y visibilidad completa."
                    </p>
                    <div className="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand/10 text-brand">AR</span>
                      <div>
                        <p className="font-semibold text-ink">Andrea Rivas</p>
                        <p>Directora de Operaciones · Northwind</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-white/70 p-4 text-sm">
                    <div>
                      <p className="font-semibold text-ink">Satisfacción promedio</p>
                      <p className="text-xs text-muted-foreground">Objetivo trimestral</p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-semibold text-brand">97%</p>
                      <p className="text-xs text-muted-foreground">+5 pts vs. trimestre anterior</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="soluciones" className="space-y-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-3xl font-semibold text-ink sm:text-4xl">Soluciones diseñadas para equipos modernos</h2>
                <p className="mt-2 max-w-2xl text-base text-muted-foreground">
                  Automatiza procesos clave, mantén la visibilidad de tu operación y ofrece experiencias hiperpersonalizadas a gran
                  escala.
                </p>
              </div>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-brand hover:text-brand"
              >
                Explorar el panel
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {solutions.map((solution) => (
                <div
                  key={solution.title}
                  className="group relative overflow-hidden rounded-3xl border border-white/60 bg-white/80 p-8 shadow-[0_20px_50px_rgba(15,23,42,0.08)] transition hover:-translate-y-1 hover:border-brand/40"
                >
                  <solution.icon className="h-10 w-10 text-brand transition group-hover:scale-105" />
                  <h3 className="mt-6 text-xl font-semibold text-ink">{solution.title}</h3>
                  <p className="mt-3 text-sm text-muted-foreground">{solution.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="beneficios" className="space-y-10">
            <div className="grid gap-6 md:grid-cols-3">
              {benefits.map((benefit) => (
                <div key={benefit.title} className="rounded-3xl border border-white/60 bg-white/80 p-8 text-center shadow-sm">
                  <p className="text-4xl font-semibold text-brand">{benefit.title}</p>
                  <p className="mt-2 text-sm font-semibold uppercase tracking-wide text-ink">{benefit.subtitle}</p>
                  <p className="mt-4 text-sm text-muted-foreground">{benefit.description}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div className="space-y-6">
                <h2 className="text-3xl font-semibold text-ink sm:text-4xl">Colaboración que se siente humana, automatización que escala</h2>
                <p className="text-base text-muted-foreground">
                  Sin importar si gestionas equipos de campo, soporte técnico o redes de proveedores, Xiris ofrece un control total
                  sobre la experiencia. Personaliza flujos, conecta canales y toma decisiones respaldadas por datos confiables.
                </p>
                <ul className="space-y-4 text-sm text-muted-foreground">
                  <li className="flex items-start gap-3">
                    <Users className="mt-0.5 h-5 w-5 text-brand" />
                    <span>
                      Colaboración omnicanal con historial unificado y notas contextuales para cada interacción.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Smartphone className="mt-0.5 h-5 w-5 text-brand" />
                    <span>Aplicaciones móviles listas para tu equipo de campo con notificaciones inteligentes.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Globe2 className="mt-0.5 h-5 w-5 text-brand" />
                    <span>Infraestructura global con cumplimiento normativo en las regiones donde operas.</span>
                  </li>
                </ul>
              </div>

              <div className="relative overflow-hidden rounded-3xl border border-white/60 bg-gradient-to-br from-brand/10 via-white to-white/60 p-8 shadow-[0_30px_70px_rgba(15,23,42,0.12)]">
                <p className="text-sm font-semibold uppercase tracking-wide text-brand">Live insights</p>
                <p className="mt-4 text-2xl font-semibold text-ink">Controla cada métrica en una sola vista</p>
                <p className="mt-3 text-sm text-muted-foreground">
                  Configura tableros personalizados, comparte reportes automáticos y detecta tendencias con IA generativa integrada.
                </p>
                <div className="mt-6 grid gap-4 text-sm">
                  <div className="rounded-2xl bg-white/80 p-4 shadow-sm">
                    <p className="font-semibold text-ink">Tiempo de resolución</p>
                    <p className="text-xs text-muted-foreground">Objetivo semanal</p>
                    <p className="mt-2 text-3xl font-semibold text-brand">-32%</p>
                  </div>
                  <div className="rounded-2xl border border-dashed border-brand/30 p-4">
                    <p className="font-semibold text-ink">Solicitudes automatizadas</p>
                    <p className="mt-1 text-xs text-muted-foreground">24.680 este mes</p>
                  </div>
                  <div className="rounded-2xl bg-brand/10 p-4 text-brand">
                    <p className="text-xs font-semibold uppercase tracking-wide">Insight recomendado</p>
                    <p className="mt-2 text-sm text-brand">
                      Prioriza la asignación de especialistas en la región norte para mantener el SLA de 15 minutos.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="como-funciona" className="space-y-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-3xl font-semibold text-ink sm:text-4xl">Comienza en tres pasos simples</h2>
                <p className="mt-2 max-w-2xl text-base text-muted-foreground">
                  Implementa Xiris a tu ritmo con acompañamiento experto y recursos diseñados para cada etapa.
                </p>
              </div>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-[0_15px_35px_rgba(124,58,237,0.3)] transition hover:bg-[#6d28d9]"
              >
                Agendar demo
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {steps.map((step, index) => (
                <div key={step.title} className="rounded-3xl border border-white/60 bg-white/80 p-8 shadow-sm">
                  <span className="text-sm font-semibold uppercase tracking-wide text-brand">Paso {index + 1}</span>
                  <h3 className="mt-4 text-xl font-semibold text-ink">{step.title}</h3>
                  <p className="mt-3 text-sm text-muted-foreground">{step.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section id="recursos" className="space-y-10">
            <div className="grid gap-6 lg:grid-cols-3">
              {resources.map((resource) => (
                <div
                  key={resource.title}
                  className="flex h-full flex-col justify-between rounded-3xl border border-white/60 bg-gradient-to-br from-white via-white/80 to-white/60 p-8 shadow-[0_25px_60px_rgba(15,23,42,0.1)]"
                >
                  <div>
                    <h3 className="text-2xl font-semibold text-ink">{resource.title}</h3>
                    <p className="mt-3 text-sm text-muted-foreground">{resource.description}</p>
                  </div>
                  <Link
                    href="/login"
                    className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand transition hover:translate-x-1"
                  >
                    {resource.action}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ))}
            </div>
          </section>
        </main>

        <footer className="border-t border-white/60 bg-white/80">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-4">
              <Link href="/" className="flex items-center gap-2 text-brand">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand text-lg font-bold text-white">x</span>
                <span className="text-xl font-semibold tracking-tight text-ink">iris</span>
              </Link>
              <p className="text-sm text-muted-foreground">
                Plataforma integral para coordinar equipos, automatizar flujos críticos y elevar la experiencia de tus usuarios.
              </p>
            </div>
            <div className="space-y-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Producto</p>
              <Link href="#soluciones" className="block text-ink transition hover:text-brand">
                Soluciones
              </Link>
              <Link href="#beneficios" className="block text-ink transition hover:text-brand">
                Beneficios
              </Link>
              <Link href="#como-funciona" className="block text-ink transition hover:text-brand">
                Cómo funciona
              </Link>
            </div>
            <div className="space-y-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recursos</p>
              <Link href="#recursos" className="block text-ink transition hover:text-brand">
                Biblioteca
              </Link>
              <Link href="/login" className="block text-ink transition hover:text-brand">
                Agendar demo
              </Link>
              <Link href="/registro" className="block text-ink transition hover:text-brand">
                Crear cuenta
              </Link>
            </div>
            <div className="space-y-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Conecta</p>
              <p className="text-ink">hola@xiris.io</p>
              <div className="flex gap-3 text-muted-foreground">
                <span>LinkedIn</span>
                <span>Behance</span>
                <span>Dribbble</span>
              </div>
            </div>
          </div>
          <div className="border-t border-white/60 bg-white/70">
            <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-6 py-6 text-xs text-muted-foreground sm:flex-row">
              <p>© {new Date().getFullYear()} Xiris. Todos los derechos reservados.</p>
              <div className="flex flex-wrap items-center gap-4">
                <Link href="/" className="transition hover:text-brand">
                  Privacidad
                </Link>
                <Link href="/" className="transition hover:text-brand">
                  Términos
                </Link>
                <Link href="/" className="transition hover:text-brand">
                  Seguridad
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}

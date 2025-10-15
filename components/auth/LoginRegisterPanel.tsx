"use client"

import { type ComponentType, useMemo, useState } from "react"
import { Linkedin, Lock, Mail, UserRound } from "lucide-react"
import { cn } from "@/lib/utils"

const tabs = [
  { id: "login", label: "Login" },
  { id: "register", label: "Register" },
] as const

type TabId = (typeof tabs)[number]["id"]

export default function LoginRegisterPanel() {
  const [activeTab, setActiveTab] = useState<TabId>("login")

  const title = useMemo(
    () => (activeTab === "login" ? "Bienvenido de vuelta" : "Crear una nueva cuenta"),
    [activeTab],
  )

  const description = useMemo(
    () =>
      activeTab === "login"
        ? "Ingresa tus credenciales para continuar explorando la plataforma."
        : "Completa los siguientes datos para registrarte en Xiris.",
    [activeTab],
  )

  return (
    <div className="w-full max-w-md rounded-3xl bg-white/80 p-8 shadow-xl ring-1 ring-black/5 backdrop-blur">
      <div className="flex items-center gap-6 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative pb-2 transition-colors ${
              tab.id === activeTab ? "text-brand" : "text-muted-foreground"
            }`}
            type="button"
          >
            {tab.label}
            {tab.id === activeTab ? (
              <span className="absolute inset-x-0 -bottom-0.5 h-0.5 rounded-full bg-brand" aria-hidden />
            ) : null}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-2 text-left">
        <h2 className="text-2xl font-semibold text-ink">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {activeTab === "login" ? <LoginForm /> : <RegisterForm />}

      <div className="mt-8">
        <div className="relative flex items-center justify-center text-xs uppercase tracking-widest text-muted-foreground">
          <span className="bg-white px-3">o continúa con</span>
          <span className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <SocialButton Icon={GoogleIcon} label="Google" />
          <SocialButton Icon={MicrosoftIcon} label="Microsoft" />
          <SocialButton Icon={Linkedin} label="LinkedIn" iconClassName="text-[#0A66C2]" />
          <SocialButton Icon={Mail} label="Correo" iconClassName="text-brand" />
        </div>
      </div>
    </div>
  )
}

function LoginForm() {
  return (
    <form className="mt-8 space-y-5">
      <div className="space-y-2">
        <label htmlFor="login-email" className="block text-sm font-medium text-ink">
          Correo electrónico
        </label>
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3 shadow-sm">
          <Mail className="h-5 w-5 text-brand" />
          <input
            id="login-email"
            type="email"
            placeholder="nombre@empresa.com"
            className="w-full border-none bg-transparent text-sm text-ink outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="login-password" className="block text-sm font-medium text-ink">
          Contraseña
        </label>
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3 shadow-sm">
          <Lock className="h-5 w-5 text-brand" />
          <input
            id="login-password"
            type="password"
            placeholder="Ingresa tu contraseña"
            className="w-full border-none bg-transparent text-sm text-ink outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <label className="flex items-center gap-2">
          <input type="checkbox" className="h-4 w-4 rounded border-border text-brand focus:ring-brand" />
          Recordarme
        </label>
        <button type="button" className="font-semibold text-brand hover:underline">
          ¿Olvidaste la contraseña?
        </button>
      </div>

      <button
        type="submit"
        className="w-full rounded-2xl bg-brand py-3 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(124,58,237,0.28)] transition-transform hover:scale-[1.01]"
      >
        Iniciar sesión
      </button>
    </form>
  )
}

function RegisterForm() {
  return (
    <form className="mt-8 space-y-5">
      <div className="space-y-2">
        <label htmlFor="register-name" className="block text-sm font-medium text-ink">
          Nombre completo
        </label>
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3 shadow-sm">
          <UserRound className="h-5 w-5 text-brand" />
          <input
            id="register-name"
            type="text"
            placeholder="Tu nombre"
            className="w-full border-none bg-transparent text-sm text-ink outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="register-email" className="block text-sm font-medium text-ink">
          Correo electrónico
        </label>
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3 shadow-sm">
          <Mail className="h-5 w-5 text-brand" />
          <input
            id="register-email"
            type="email"
            placeholder="nombre@empresa.com"
            className="w-full border-none bg-transparent text-sm text-ink outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="register-password" className="block text-sm font-medium text-ink">
          Contraseña
        </label>
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3 shadow-sm">
          <Lock className="h-5 w-5 text-brand" />
          <input
            id="register-password"
            type="password"
            placeholder="Crea una contraseña"
            className="w-full border-none bg-transparent text-sm text-ink outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="register-password-confirm" className="block text-sm font-medium text-ink">
          Confirmar contraseña
        </label>
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3 shadow-sm">
          <Lock className="h-5 w-5 text-brand" />
          <input
            id="register-password-confirm"
            type="password"
            placeholder="Repite la contraseña"
            className="w-full border-none bg-transparent text-sm text-ink outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <label className="flex items-start gap-3 text-xs text-muted-foreground">
        <input type="checkbox" className="mt-1 h-4 w-4 rounded border-border text-brand focus:ring-brand" />
        Acepto los términos y condiciones, y autorizo el uso de mis datos según la política de privacidad.
      </label>

      <button
        type="submit"
        className="w-full rounded-2xl bg-brand py-3 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(124,58,237,0.28)] transition-transform hover:scale-[1.01]"
      >
        Crear cuenta
      </button>
    </form>
  )
}

interface SocialButtonProps {
  Icon: ComponentType<{ className?: string }>
  label: string
  iconClassName?: string
  className?: string
}

function SocialButton({ Icon, label, iconClassName, className }: SocialButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-white py-2 text-sm font-semibold text-ink shadow-sm transition hover:border-brand hover:text-brand",
        className,
      )}
    >
      <Icon className={cn("h-4 w-4", iconClassName)} />
      {label}
    </button>
  )
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-4 w-4", className)}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M21.6 12.227c0-.638-.057-1.252-.163-1.84H12v3.481h5.381a4.599 4.599 0 0 1-1.995 3.017v2.508h3.23c1.89-1.739 2.984-4.3 2.984-7.166Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.7 0 4.968-.893 6.624-2.415l-3.23-2.508c-.896.6-2.04.955-3.394.955-2.611 0-4.822-1.764-5.611-4.144H3.05v2.603A9.997 9.997 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.389 13.888A5.996 5.996 0 0 1 6.077 12c0-.655.113-1.29.312-1.888V7.509H3.05A9.997 9.997 0 0 0 2 12c0 1.61.38 3.135 1.05 4.491l3.339-2.603Z"
        fill="#FBBC05"
      />
      <path
        d="M12 6.6c1.467 0 2.785.505 3.821 1.495l2.866-2.866C16.964 3.384 14.7 2.4 12 2.4a9.997 9.997 0 0 0-8.95 5.109l3.339 2.603C7.178 8.364 9.389 6.6 12 6.6Z"
        fill="#EA4335"
      />
    </svg>
  )
}

function MicrosoftIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-4 w-4", className)}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path fill="#F35325" d="M3 3h9v9H3z" />
      <path fill="#81BC06" d="M12 3h9v9h-9z" />
      <path fill="#05A6F0" d="M3 12h9v9H3z" />
      <path fill="#FFBA08" d="M12 12h9v9h-9z" />
    </svg>
  )
}

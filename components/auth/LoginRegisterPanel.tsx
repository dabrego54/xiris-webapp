"use client"

import { useMemo, useState } from "react"
import { Facebook, Fingerprint, Linkedin, Lock, Mail, UserRound } from "lucide-react"

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

        <div className="mt-6 flex items-center justify-between gap-4">
          <SocialButton Icon={Facebook} label="Facebook" />
          <SocialButton Icon={Linkedin} label="LinkedIn" />
          <SocialButton Icon={Mail} label="Correo" />
        </div>
      </div>

      <button
        type="button"
        className="mt-10 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand to-brand-600 py-3 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(124,58,237,0.28)] transition-transform hover:scale-[1.01]"
      >
        <Fingerprint className="h-5 w-5" />
        Login con Touch ID
      </button>
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
  Icon: typeof Facebook
  label: string
}

function SocialButton({ Icon, label }: SocialButtonProps) {
  return (
    <button
      type="button"
      className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-white py-2 text-xs font-semibold text-ink shadow-sm transition hover:border-brand hover:text-brand"
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  )
}

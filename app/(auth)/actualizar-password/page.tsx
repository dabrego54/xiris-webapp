"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { Eye, EyeOff, Loader2, Lock } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { updatePassword } from "@/app/actions/auth.actions"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { updatePasswordSchema, type UpdatePasswordSchema } from "@/lib/validations/auth.validation"

const brandGradient =
  "bg-gradient-to-r from-[#8B5CF6] via-[#7C3AED] to-[#5B21B6] text-white shadow-[0_18px_48px_rgba(93,63,211,0.35)]"

type UpdatePasswordFormValues = UpdatePasswordSchema

interface PasswordStrengthResult {
  percentage: number
  label: string
  className: string
}

function calculatePasswordStrength(password: string): PasswordStrengthResult {
  if (!password) {
    return { percentage: 0, label: "Muy débil", className: "text-red-500" }
  }

  let score = 0

  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1

  const percentage = Math.min(100, Math.round((score / 5) * 100))

  if (percentage >= 80) {
    return { percentage, label: "Muy segura", className: "text-emerald-600" }
  }

  if (percentage >= 60) {
    return { percentage, label: "Segura", className: "text-emerald-500" }
  }

  if (percentage >= 40) {
    return { percentage, label: "Aceptable", className: "text-amber-500" }
  }

  if (percentage >= 20) {
    return { percentage, label: "Débil", className: "text-orange-500" }
  }

  return { percentage, label: "Muy débil", className: "text-red-500" }
}

export default function UpdatePasswordPage(): JSX.Element {
  const router = useRouter()
  const searchParams = useSearchParams()
  const searchParamsString = searchParams.toString()
  const [isVerifyingToken, setIsVerifyingToken] = useState(true)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [isTokenValid, setIsTokenValid] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [successMessageVisible, setSuccessMessageVisible] = useState(false)

  const form = useForm<UpdatePasswordFormValues>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  })

  const passwordValue = form.watch("password")

  const passwordStrength = useMemo(() => calculatePasswordStrength(passwordValue), [passwordValue])

  useEffect(() => {
    let isMounted = true

    const verifyToken = async () => {
      setIsVerifyingToken(true)
      setTokenError(null)

      try {
        const supabase = getSupabaseBrowserClient()
        const currentUrl = new URL(window.location.href)
        const params = currentUrl.searchParams
        const hashParams = new URLSearchParams(currentUrl.hash.startsWith("#") ? currentUrl.hash.slice(1) : currentUrl.hash)

        const type = params.get("type") ?? hashParams.get("type")
        if (type && type !== "recovery") {
          throw new Error("invalid-type")
        }

        const code = params.get("code")

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)

          if (error) {
            throw error
          }
        } else {
          const accessToken = params.get("access_token") ?? hashParams.get("access_token")
          const refreshToken = params.get("refresh_token") ?? hashParams.get("refresh_token")

          if (!accessToken || !refreshToken) {
            throw new Error("missing-tokens")
          }

          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (error) {
            throw error
          }
        }

        if (!isMounted) {
          return
        }

        setIsTokenValid(true)
      } catch (error) {
        console.error("No se pudo validar el token de recuperación", error)

        if (!isMounted) {
          return
        }

        let message = "El enlace de recuperación no es válido."

        if (error instanceof Error) {
          const normalized = error.message.toLowerCase()

          if (normalized.includes("expired")) {
            message = "El enlace ha expirado. Solicita uno nuevo."
          } else if (normalized === "invalid-type") {
            message = "El enlace de recuperación no es válido."
          } else if (normalized === "missing-tokens" || normalized.includes("missing")) {
            message = "El token de recuperación es inválido o está incompleto."
          }
        }

        setTokenError(message)
        setIsTokenValid(false)
      } finally {
        if (isMounted) {
          setIsVerifyingToken(false)
        }
      }
    }

    void verifyToken()

    return () => {
      isMounted = false
    }
  }, [searchParamsString])

  useEffect(() => {
    if (!successMessageVisible) {
      return
    }

    const timer = window.setTimeout(() => {
      router.push("/auth/login")
    }, 2000)

    return () => {
      window.clearTimeout(timer)
    }
  }, [router, successMessageVisible])

  const onSubmit = async (values: UpdatePasswordFormValues) => {
    if (!isTokenValid) {
      return
    }

    setIsSubmitting(true)

    try {
      const { error } = await updatePassword(values.password)

      if (error) {
        toast.error(error)
        return
      }

      toast.success("Contraseña actualizada exitosamente")
      setSuccessMessageVisible(true)
    } catch (error) {
      console.error("No se pudo actualizar la contraseña", error)
      toast.error("Ocurrió un error inesperado. Inténtalo nuevamente.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-[#F5F3FF] to-[#EDE9FE] px-4 py-12">
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center justify-center">
        <div className="w-full max-w-2xl overflow-hidden rounded-[32px] bg-white/95 shadow-[0_30px_70px_rgba(88,28,135,0.18)] ring-1 ring-[#8B5CF6]/10 backdrop-blur">
          <div className="space-y-10 px-6 py-10 sm:px-12">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#8B5CF6]/10 text-[#8B5CF6]">
                  <span className="text-xl font-bold">X</span>
                </div>
                <span className="text-2xl font-semibold text-slate-900">Xiris</span>
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold text-slate-900">Crea una nueva contraseña</h1>
                <p className="text-sm text-slate-500">
                  Ingresa una contraseña segura para proteger tu cuenta
                </p>
              </div>
            </div>

            {isVerifyingToken ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-2xl bg-[#8B5CF6]/5 px-6 py-10 text-center text-sm text-slate-600">
                <Loader2 className="h-6 w-6 animate-spin text-[#8B5CF6]" />
                Validando enlace de recuperación…
              </div>
            ) : null}

            {!isVerifyingToken && tokenError ? (
              <div className="rounded-2xl bg-red-50 px-6 py-5 text-center text-sm font-medium text-red-600">
                {tokenError}
              </div>
            ) : null}

            {!isVerifyingToken && isTokenValid ? (
              <Form {...form}>
                <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nueva contraseña</FormLabel>
                        <div className="relative">
                          <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8B5CF6]" />
                          <FormControl>
                            <Input
                              {...field}
                              type={showPassword ? "text" : "password"}
                              className="pl-11 pr-12"
                              placeholder="Ingresa tu nueva contraseña"
                              autoComplete="new-password"
                              aria-label="Nueva contraseña"
                            />
                          </FormControl>
                          <button
                            type="button"
                            onClick={() => setShowPassword((previous) => !previous)}
                            className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 transition hover:text-[#8B5CF6]"
                            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                          >
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-2">
                    <Progress value={passwordStrength.percentage} aria-label="Fortaleza de contraseña" />
                    <p className={`text-xs font-medium ${passwordStrength.className}`}>
                      Fortaleza: {passwordStrength.label}
                    </p>
                  </div>

                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirmar contraseña</FormLabel>
                        <div className="relative">
                          <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8B5CF6]" />
                          <FormControl>
                            <Input
                              {...field}
                              type="password"
                              className="pl-11"
                              placeholder="Confirma tu nueva contraseña"
                              autoComplete="new-password"
                              aria-label="Confirmar contraseña"
                            />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {successMessageVisible ? (
                    <p className="rounded-2xl bg-[#8B5CF6]/10 px-4 py-3 text-sm font-medium text-[#5B21B6]">
                      Contraseña actualizada correctamente. Te redirigiremos al inicio de sesión…
                    </p>
                  ) : null}

                  <Button
                    type="submit"
                    className={`${brandGradient} h-12 w-full rounded-full text-base font-semibold transition hover:brightness-105 focus-visible:ring-offset-0`}
                    disabled={isSubmitting || successMessageVisible}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Actualizando…
                      </span>
                    ) : (
                      "Actualizar contraseña"
                    )}
                  </Button>
                </form>
              </Form>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

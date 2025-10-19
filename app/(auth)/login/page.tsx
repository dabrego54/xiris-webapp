"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { signIn } from "@/app/actions/auth.actions"
import { GoogleAuthDialog } from "@/components/auth/google-auth-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { signInSchema } from "@/lib/validations/auth.validation"

const loginSchema = signInSchema.extend({
  rememberMe: z.boolean().optional(),
})

type SignInFormValues = z.infer<typeof loginSchema>

const brandGradient =
  "bg-gradient-to-r from-[#8B5CF6] via-[#7C3AED] to-[#5B21B6] text-white shadow-[0_18px_48px_rgba(93,63,211,0.35)]"

export default function LoginPage(): JSX.Element {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<SignInFormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  })

  const redirectTo = searchParams?.get("redirect") ?? undefined

  const onSubmit = async (values: SignInFormValues) => {
    setIsSubmitting(true)

    try {
      const { error } = await signIn(values.email.trim(), values.password)

      if (error) {
        const message = error.toLowerCase()

        if (message.includes("credenciales")) {
          toast.error("Credenciales inválidas. Verifica tus datos.")
        } else if (message.includes("no verificado")) {
          toast.error("Tu email aún no ha sido verificado. Revisa tu bandeja de entrada.")
        } else if (message.includes("suspendid")) {
          toast.error("Tu cuenta está suspendida. Contacta al soporte de Xiris.")
        } else {
          toast.error(error)
        }

        return
      }

      toast.success("Bienvenido de vuelta a Xiris")
      router.push(redirectTo ?? "/dashboard")
    } catch (error) {
      console.error("No se pudo completar el inicio de sesión", error)
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
                <h1 className="text-3xl font-semibold text-slate-900">Bienvenido de vuelta</h1>
                <p className="text-sm text-slate-500">Ingresa tus credenciales para continuar gestionando tus servicios.</p>
              </div>
            </div>

            <Form {...form}>
              <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Correo electrónico</FormLabel>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8B5CF6]" />
                        <FormControl>
                          <Input
                            {...field}
                            type="email"
                            className="pl-11"
                            placeholder="nombre@empresa.com"
                            autoComplete="email"
                            aria-label="Correo electrónico"
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contraseña</FormLabel>
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8B5CF6]" />
                        <FormControl>
                          <Input
                            {...field}
                            type={showPassword ? "text" : "password"}
                            className="pl-11 pr-12"
                            placeholder="Ingresa tu contraseña"
                            autoComplete="current-password"
                            aria-label="Contraseña"
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

                <div className="flex flex-col gap-3 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                  <FormField
                    control={form.control}
                    name="rememberMe"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center gap-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={(checked) => field.onChange(checked === true)}
                            aria-label="Recordarme"
                          />
                        </FormControl>
                        <span className="text-sm text-slate-600">Recordarme</span>
                      </FormItem>
                    )}
                  />

                  <Link
                    href="/auth/recuperar"
                    className="text-sm font-semibold text-[#8B5CF6] transition hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>

                <Button
                  type="submit"
                  className={`${brandGradient} h-12 w-full rounded-full text-base font-semibold transition hover:brightness-105 focus-visible:ring-offset-0`}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Iniciando sesión…
                    </span>
                  ) : (
                    "Iniciar Sesión"
                  )}
                </Button>
              </form>
            </Form>

            <div className="space-y-6">
              <div className="relative flex items-center justify-center text-sm uppercase tracking-wide text-slate-400">
                <span className="bg-white px-4">O continúa con</span>
                <span className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
              </div>

              <GoogleAuthDialog
                brandGradientClassName={brandGradient}
                className="rounded-full"
                flow="login"
                redirectTo={redirectTo}
              />

              <p className="text-center text-sm text-slate-600">
                ¿No tienes cuenta?{" "}
                <Link href="/registro" className="font-semibold text-[#8B5CF6] hover:underline">
                  Regístrate
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

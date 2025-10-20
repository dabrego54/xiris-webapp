"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Mail } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { resetPassword } from "@/app/actions/auth.actions"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { passwordResetSchema, type PasswordResetSchema } from "@/lib/validations/auth.validation"

const brandGradient =
  "bg-gradient-to-r from-[#8B5CF6] via-[#7C3AED] to-[#5B21B6] text-white shadow-[0_18px_48px_rgba(93,63,211,0.35)]"

const COOLDOWN_SECONDS = 60

type PasswordResetFormValues = PasswordResetSchema

export default function PasswordRecoveryPage(): JSX.Element {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)

  const form = useForm<PasswordResetFormValues>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: {
      email: "",
    },
  })

  const isCooldownActive = secondsRemaining > 0
  const submitButtonLabel = useMemo(() => {
    if (isCooldownActive) {
      return `Reintentar en ${secondsRemaining}s`
    }

    return "Enviar link de recuperación"
  }, [isCooldownActive, secondsRemaining])

  useEffect(() => {
    if (!isCooldownActive) {
      return
    }

    const timer = window.setInterval(() => {
      setSecondsRemaining((previous) => {
        if (previous <= 1) {
          window.clearInterval(timer)
          return 0
        }

        return previous - 1
      })
    }, 1000)

    return () => {
      window.clearInterval(timer)
    }
  }, [isCooldownActive])

  const onSubmit = async (values: PasswordResetFormValues) => {
    setIsSubmitting(true)

    try {
      const { error } = await resetPassword(values.email.trim())

      if (error) {
        toast.error(error)
        return
      }

      toast.success("Email enviado. Revisa tu bandeja de entrada")
      setShowSuccessMessage(true)
      setSecondsRemaining(COOLDOWN_SECONDS)
    } catch (error) {
      console.error("No se pudo enviar el correo de recuperación", error)
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
                <h1 className="text-3xl font-semibold text-slate-900">Recupera tu contraseña</h1>
                <p className="text-sm text-slate-500">
                  Ingresa tu email y te enviaremos un link para restablecer tu contraseña
                </p>
              </div>
            </div>

            <Form {...form}>
              <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
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

                {showSuccessMessage ? (
                  <p className="rounded-2xl bg-[#8B5CF6]/10 px-4 py-3 text-sm font-medium text-[#5B21B6]">
                    Email enviado. Revisa tu bandeja de entrada
                  </p>
                ) : null}

                <Button
                  type="submit"
                  className={`${brandGradient} h-12 w-full rounded-full text-base font-semibold transition hover:brightness-105 focus-visible:ring-offset-0`}
                  disabled={isSubmitting || isCooldownActive}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Enviando…
                    </span>
                  ) : (
                    submitButtonLabel
                  )}
                </Button>
              </form>
            </Form>

            <div className="text-center text-sm text-slate-600">
              <Link href="/auth/login" className="font-semibold text-[#8B5CF6] transition hover:underline">
                Volver a iniciar sesión
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

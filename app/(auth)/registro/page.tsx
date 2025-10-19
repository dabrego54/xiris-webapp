"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Lock, Mail, Phone, User, UserRound, Wrench, Eye, EyeOff } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { signUp } from "@/app/actions/auth.actions"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { signUpSchema } from "@/lib/validations/auth.validation"
import type { SignUpData } from "@/types/database.types"

const brandGradient =
  "bg-gradient-to-r from-[#8B5CF6] via-[#7C3AED] to-[#5B21B6] text-white shadow-[0_18px_48px_rgba(93,63,211,0.35)]"

const googleIcon = (
  <svg aria-hidden className="h-5 w-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M12.24 10.8v3.84h5.36c-.22 1.23-.96 2.27-2.06 2.97l3.33 2.58c1.95-1.8 3.07-4.44 3.07-7.59 0-.73-.07-1.44-.2-2.12z"
      fill="#4285F4"
    />
    <path
      d="M6.7 14.32l-.84.64-2.64 2.05C4.93 20.5 8.31 22.8 12.24 22.8c2.94 0 5.4-.97 7.2-2.61l-3.33-2.58c-.9.6-2.06.96-3.87.96-2.97 0-5.49-1.98-6.4-4.74z"
      fill="#34A853"
    />
    <path
      d="M3.22 6.99A10.5 10.5 0 0 0 1.44 12c0 1.86.48 3.61 1.32 5.13 0 .04 3.94-3.05 3.94-3.05-.24-.72-.38-1.49-.38-2.3 0-.8.14-1.57.38-2.29z"
      fill="#FBBC05"
    />
    <path
      d="M12.24 5.4c1.61 0 3.05.56 4.19 1.64l3.12-3.11C17.62 1.7 15.18.6 12.24.6 8.31.6 4.93 2.91 3.22 6.99l3.94 3.06c.91-2.76 3.43-4.65 6.4-4.65z"
      fill="#EA4335"
    />
  </svg>
)

type SignUpFormValues = z.infer<typeof signUpSchema>

export default function RegisterPage(): JSX.Element {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    mode: "onChange",
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      full_name: "",
      phone: "",
      user_type: "cliente",
      terms: false,
    },
  })

  const onSubmit = async (values: SignUpFormValues) => {
    setIsSubmitting(true)

    try {
      const payload: SignUpData = {
        email: values.email.trim(),
        password: values.password,
        full_name: values.full_name.trim(),
        phone: values.phone.trim() ? values.phone.trim() : undefined,
        user_type: values.user_type,
        metadata: {
          termsAccepted: values.terms,
          marketingOptIn: false,
        },
      }

      const { error } = await signUp(payload)

      if (error) {
        toast.error(error)
        return
      }

      toast.success("Cuenta creada correctamente. Redirigiendo…")
      router.push("/dashboard")
    } catch (error) {
      console.error("No se pudo completar el registro", error)
      toast.error("Ocurrió un error inesperado. Inténtalo nuevamente.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-[#F5F3FF] to-[#EDE9FE] px-4 py-12">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-center">
        <div className="w-full max-w-3xl overflow-hidden rounded-[32px] bg-white/90 shadow-[0_35px_80px_rgba(88,28,135,0.15)] ring-1 ring-[#8B5CF6]/10 backdrop-blur">
          <div className="relative space-y-10 px-6 py-10 sm:px-12">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#8B5CF6]/10 text-[#8B5CF6]">
                  <span className="text-xl font-bold">X</span>
                </div>
                <span className="text-2xl font-semibold text-slate-900">Xiris</span>
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold text-slate-900">Crea tu cuenta</h1>
                <p className="text-sm text-slate-500">
                  Únete a la comunidad Xiris y conecta con especialistas técnicos de confianza.
                </p>
              </div>
            </div>

            <Form {...form}>
              <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
                <div className="grid gap-6 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="full_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre completo</FormLabel>
                        <div className="relative">
                          <User className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8B5CF6]" />
                          <FormControl>
                            <Input
                              {...field}
                              className="pl-11"
                              placeholder="Tu nombre completo"
                              autoComplete="name"
                              aria-label="Nombre completo"
                            />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teléfono</FormLabel>
                        <div className="relative">
                          <Phone className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8B5CF6]" />
                          <FormControl>
                            <Input
                              {...field}
                              className="pl-11"
                              placeholder="+56 9 1234 5678"
                              autoComplete="tel"
                              inputMode="tel"
                              aria-label="Número de teléfono"
                            />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

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

                <div className="grid gap-6 sm:grid-cols-2">
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
                              placeholder="Ingresa una contraseña segura"
                              autoComplete="new-password"
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
                              placeholder="Repite tu contraseña"
                              autoComplete="new-password"
                              aria-label="Confirmar contraseña"
                            />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="user_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de usuario</FormLabel>
                      <FormControl>
                        <RadioGroup
                          className="grid gap-3 md:grid-cols-2"
                          onValueChange={field.onChange}
                          value={field.value}
                          aria-label="Selecciona el tipo de usuario"
                        >
                          <RadioGroupItem value="cliente">
                            <div className="flex flex-col gap-2 pr-6">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#8B5CF6]/10 text-[#8B5CF6]">
                                  <UserRound className="h-5 w-5" />
                                </div>
                                <div>
                                  <p className="font-medium text-slate-900">Cliente</p>
                                  <p className="text-sm text-slate-500">Solicita servicios técnicos</p>
                                </div>
                              </div>
                            </div>
                          </RadioGroupItem>
                          <RadioGroupItem value="tecnico">
                            <div className="flex flex-col gap-2 pr-6">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#8B5CF6]/10 text-[#8B5CF6]">
                                  <Wrench className="h-5 w-5" />
                                </div>
                                <div>
                                  <p className="font-medium text-slate-900">Técnico</p>
                                  <p className="text-sm text-slate-500">Ofrece servicios técnicos</p>
                                </div>
                              </div>
                            </div>
                          </RadioGroupItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="terms"
                  render={({ field }) => (
                    <FormItem className="space-y-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                      <div className="flex items-start gap-3">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={(checked) => field.onChange(checked === true)}
                            aria-label="Aceptar términos y condiciones"
                          />
                        </FormControl>
                        <div className="text-sm text-slate-600">
                          <span>
                            Acepto los{" "}
                            <Link href="/terminos" className="font-semibold text-[#8B5CF6] hover:underline">
                              términos y condiciones
                            </Link>
                            .
                          </span>
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className={`${brandGradient} h-12 w-full rounded-full text-base font-semibold transition hover:brightness-105 focus-visible:ring-offset-0`}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Creando cuenta…
                    </span>
                  ) : (
                    "Crear Cuenta"
                  )}
                </Button>
              </form>
            </Form>

            <div className="space-y-6">
              <div className="relative flex items-center justify-center text-sm uppercase tracking-wide text-slate-400">
                <span className="bg-white px-4">O continúa con</span>
                <span className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full justify-center gap-3 rounded-full border-slate-200 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-[#8B5CF6]/60 hover:text-[#8B5CF6]"
                disabled={isSubmitting}
              >
                {googleIcon}
                Continuar con Google
              </Button>

              <p className="text-center text-sm text-slate-600">
                ¿Ya tienes cuenta?{" "}
                <Link href="/login" className="font-semibold text-[#8B5CF6] hover:underline">
                  Inicia sesión
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

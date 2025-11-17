"use client"

import { useCallback, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { Eye, EyeOff, Loader2, Lock, Mail, Phone, User, UserRound, Wrench } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { checkEmailAvailability } from "@/app/actions/auth.actions"
import { ensureProfileContactInfo } from "@/app/actions/profile.actions"
import { GoogleAuthDialog } from "@/components/auth/google-auth-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { signUpSchema } from "@/lib/validations/auth.validation"

const brandGradient =
  "bg-gradient-to-r from-[#8B5CF6] via-[#7C3AED] to-[#5B21B6] text-white shadow-[0_18px_48px_rgba(93,63,211,0.35)]"

type SignUpFormValues = z.infer<typeof signUpSchema>

type ContactInfo = {
  fullName: string
  phone: string | null
}

export default function RegisterPage(): JSX.Element {
  const router = useRouter()
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCheckingConfirmation, setIsCheckingConfirmation] = useState(false)
  const [isAwaitingConfirmation, setIsAwaitingConfirmation] = useState(false)
  const [pendingEmail, setPendingEmail] = useState("")
  const [pendingPassword, setPendingPassword] = useState("")
  const [pendingUserType, setPendingUserType] = useState<SignUpFormValues["user_type"] | null>(null)
  const [pendingContactInfo, setPendingContactInfo] = useState<ContactInfo | null>(null)

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

  const resolveRedirectPath = useCallback((userType: SignUpFormValues["user_type"]): string => {
    return userType === "tecnico" ? "/apply/technician?apply=technician" : "/dashboard"
  }, [])

  const handlePostAuthentication = useCallback(
    async (userType: SignUpFormValues["user_type"], contactInfo: ContactInfo) => {
      try {
        const result = await ensureProfileContactInfo({
          fullName: contactInfo.fullName,
          phone: contactInfo.phone,
        })

        if (result.error) {
          toast.error(result.error)
        }
      } catch (error) {
        console.error("No se pudo guardar la información de contacto tras el registro.", error)
        toast.error("No se pudo guardar tu información de contacto. Puedes actualizarla más tarde en tu perfil.")
      } finally {
        setIsAwaitingConfirmation(false)
        setPendingEmail("")
        setPendingPassword("")
        setPendingUserType(null)
        setPendingContactInfo(null)
      }

      const destination = resolveRedirectPath(userType)
      router.replace(destination)
    },
    [resolveRedirectPath, router]
  )

  const onSubmit = async (values: SignUpFormValues) => {
    setIsSubmitting(true)
    setIsAwaitingConfirmation(false)

    try {
      const email = values.email.trim()
      const fullName = values.full_name.trim()
      const phone = values.phone?.trim() ?? ""
      const userType = values.user_type
      const contactInfo: ContactInfo = {
        fullName,
        phone: phone ? phone : null,
      }

      const redirectPath = resolveRedirectPath(userType)
      const emailRedirectTo =
        typeof window !== "undefined"
          ? `${window.location.origin}/auth/callback?redirect_to=${encodeURIComponent(redirectPath)}`
          : undefined

      const { available, error: availabilityError } = await checkEmailAvailability(email)

      if (!available) {
        toast.error(availabilityError ?? "Este correo ya está registrado. Intenta iniciar sesión.")
        return
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password: values.password,
        options: {
          data: {
            full_name: fullName,
            phone: contactInfo.phone,
          },
          ...(emailRedirectTo ? { emailRedirectTo } : {}),
        },
      })

      if (error) {
        toast.error(error.message ?? "No pudimos crear tu cuenta. Inténtalo nuevamente.")
        return
      }

      setPendingEmail(email)
      setPendingPassword(values.password)
      setPendingUserType(userType)
      setPendingContactInfo(contactInfo)

      if (data.session) {
        toast.success("Cuenta creada correctamente. Redirigiendo…")
        await handlePostAuthentication(userType, contactInfo)
        return
      }

      setIsAwaitingConfirmation(true)
      toast.success("Cuenta creada. Revisa tu correo para confirmar tu cuenta.")
    } catch (error) {
      console.error("No se pudo completar el registro", error)
      toast.error("Ocurrió un error inesperado. Inténtalo nuevamente.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleConfirmationCheck = useCallback(async () => {
    if (!pendingEmail || !pendingPassword || !pendingUserType || !pendingContactInfo) {
      toast.error("No se pudo verificar tu cuenta. Intenta registrarte nuevamente.")
      return
    }

    setIsCheckingConfirmation(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: pendingEmail,
        password: pendingPassword,
      })

      if (error) {
        toast.error("No pudimos iniciar sesión. Asegúrate de haber confirmado tu correo.")
        return
      }

      toast.success("¡Correo confirmado! Redirigiendo…")
      await handlePostAuthentication(pendingUserType, pendingContactInfo)
    } catch (error) {
      console.error("No se pudo verificar la confirmación de correo.", error)
      toast.error("Ocurrió un problema al verificar tu cuenta. Intenta nuevamente.")
    } finally {
      setIsCheckingConfirmation(false)
    }
  }, [handlePostAuthentication, pendingContactInfo, pendingEmail, pendingPassword, pendingUserType, supabase])

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
              {isAwaitingConfirmation ? (
                <div className="space-y-6">
                  <div className="space-y-2 text-center">
                    <h2 className="text-2xl font-semibold text-slate-900">Revisa tu correo</h2>
                    <p className="text-sm text-slate-600">
                      Te enviamos un enlace de confirmación a {" "}
                      <span className="font-semibold text-slate-900">{pendingEmail}</span>. Una vez confirmado, presiona el botón
                      para continuar.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <Button
                      type="button"
                      className={`${brandGradient} h-12 w-full rounded-full text-base font-semibold transition hover:brightness-105 focus-visible:ring-offset-0 sm:w-auto sm:px-8`}
                      onClick={() => void handleConfirmationCheck()}
                      disabled={isCheckingConfirmation}
                    >
                      {isCheckingConfirmation ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Verificando…
                        </span>
                      ) : (
                        "Ya confirmé"
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-12 w-full rounded-full text-base font-semibold sm:w-auto sm:px-8"
                      onClick={() => setIsAwaitingConfirmation(false)}
                      disabled={isCheckingConfirmation}
                    >
                      Editar información
                    </Button>
                  </div>
                </div>
              ) : (
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
              )}
            </Form>

            <div className="space-y-6">
              <div className="relative flex items-center justify-center text-sm uppercase tracking-wide text-slate-400">
                <span className="bg-white px-4">O continúa con</span>
                <span className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
              </div>

              <GoogleAuthDialog
                brandGradientClassName={brandGradient}
                className="rounded-full"
                flow="register"
              />

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

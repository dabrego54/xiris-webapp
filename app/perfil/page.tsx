"use client"

import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import * as Tabs from "@radix-ui/react-tabs"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { getCurrentUser, updatePassword, updateProfile } from "@/app/actions/auth.actions"
import { PAYMENT_METHODS, SERVICE_AREAS, SPECIALTY_OPTIONS } from "@/app/perfil/constants"
import {
  GeneralInfoSection,
  ClientInfoSection,
  TechnicianInfoSection,
  SecuritySection,
  NotificationsSection,
  type SessionItem,
  type VerificationDocument,
} from "@/components/profile/profile-sections"
import AppShell from "@/components/AppShell"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Form } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { profileFormSchema, defaultProfileValues, type ProfileFormValues } from "@/app/perfil/profile-form"
import { updatePasswordSchema } from "@/lib/validations/auth.validation"
import type { DatabaseProfile } from "@/types/database.types"

const passwordSchema = updatePasswordSchema

type PasswordFormValues = z.infer<typeof passwordSchema>

type MetadataPreferences = {
  twoFactorEnabled: boolean
  emailNotifications: boolean
  pushNotifications: boolean
  smsNotifications: boolean
}

export default function ProfilePage(): JSX.Element {
  const router = useRouter()
  const [currentProfile, setCurrentProfile] = useState<DatabaseProfile | null>(null)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [isFetching, setIsFetching] = useState(true)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [selectedAvatar, setSelectedAvatar] = useState<File | null>(null)
  const [selectedDocuments, setSelectedDocuments] = useState<File[]>([])
  const [activeSessions, setActiveSessions] = useState<SessionItem[]>([])
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [isUploadingDocuments, setIsUploadingDocuments] = useState(false)
  const [passwordSubmitting, setPasswordSubmitting] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [metadataDefaults, setMetadataDefaults] = useState<MetadataPreferences>({
    twoFactorEnabled: false,
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
  })
  const avatarPreviewRef = useRef<string | null>(null)

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    mode: "onChange",
    defaultValues: defaultProfileValues,
  })

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    mode: "onChange",
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  })

  useEffect(() => {
    let mounted = true

    async function loadProfile() {
      try {
        setIsFetching(true)
        const result = await getCurrentUser()

        if (!mounted) return

        if (!result || !result.user) {
          toast.error("Debes iniciar sesión para ver tu perfil.")
          router.push("/auth/login")
          return
        }

        const { user, profile } = result

        setProfileId(user.id)
        setCurrentProfile(profile ?? null)

        const metadata = (user.user_metadata ?? {}) as Record<string, unknown>
        const boolFromMetadata = (key: string, fallback: boolean): boolean => {
          const value = metadata[key]
          return typeof value === "boolean" ? value : fallback
        }

        const initialMetadata: MetadataPreferences = {
          twoFactorEnabled: boolFromMetadata("twoFactorEnabled", false),
          emailNotifications: boolFromMetadata("emailNotifications", true),
          pushNotifications: boolFromMetadata("pushNotifications", true),
          smsNotifications: boolFromMetadata("smsNotifications", false),
        }

        setMetadataDefaults(initialMetadata)

        form.reset({
          full_name: profile?.full_name ?? "",
          phone: profile?.phone ?? "",
          avatar_url: profile?.avatar_url ?? "",
          address: profile?.client_profile?.address ?? "",
          specialties: profile?.technician_profile?.specialties ?? [],
          service_areas: profile?.technician_profile?.service_areas ?? [],
          preferred_payment_method: profile?.client_profile?.preferred_payment_method ?? "",
          twoFactorEnabled: initialMetadata.twoFactorEnabled,
          emailNotifications: initialMetadata.emailNotifications,
          pushNotifications: initialMetadata.pushNotifications,
          smsNotifications: initialMetadata.smsNotifications,
        })

        if (profile?.avatar_url) {
          setAvatarPreview(profile.avatar_url)
        }

        const supabase = getSupabaseBrowserClient()
        const [{ data: sessionData }] = await Promise.all([
          supabase.auth.getSession(),
        ])

        if (sessionData.session) {
          const session = sessionData.session
          setActiveSessions([
            {
              id: session.refresh_token ?? session.access_token,
              device: session.user?.email ?? "Dispositivo actual",
              lastActive: new Date(session.expires_at ? session.expires_at * 1000 : Date.now()).toLocaleString(),
            },
          ])
        }
      } catch (error) {
        console.error("No se pudo cargar el perfil", error)
        toast.error("No se pudo cargar tu perfil. Inténtalo nuevamente.")
      } finally {
        if (mounted) {
          setIsFetching(false)
        }
      }
    }

    loadProfile()

    return () => {
      mounted = false
    }
  }, [form, router])

  useEffect(() => {
    if (
      avatarPreviewRef.current &&
      avatarPreviewRef.current !== avatarPreview &&
      avatarPreviewRef.current.startsWith("blob:")
    ) {
      URL.revokeObjectURL(avatarPreviewRef.current)
    }

    avatarPreviewRef.current = avatarPreview
  }, [avatarPreview])

  useEffect(() => {
    return () => {
      if (avatarPreviewRef.current && avatarPreviewRef.current.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreviewRef.current)
      }
    }
  }, [])

  const uploadAvatar = async (userId: string, file: File): Promise<string | null> => {
    try {
      const supabase = getSupabaseBrowserClient()
      const extension = file.name.split(".").pop() ?? "jpg"
      const filePath = `${userId}/avatar-${Date.now()}.${extension}`
      const { error } = await supabase.storage.from("avatars").upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      })

      if (error) {
        throw error
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath)
      return data.publicUrl
    } catch (error) {
      console.error("No se pudo subir el avatar", error)
      toast.error("No se pudo subir la nueva imagen de perfil.")
      return null
    }
  }

  const uploadVerificationDocuments = async (
    userId: string,
    files: File[],
  ): Promise<Record<string, string>> => {
    if (files.length === 0) {
      return {}
    }

    const supabase = getSupabaseBrowserClient()
    const uploaded: Record<string, string> = {}

    try {
      setIsUploadingDocuments(true)

      for (const file of files) {
        const filePath = `${userId}/document-${Date.now()}-${file.name}`
        const { error } = await supabase.storage.from("verification-documents").upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        })

        if (error) {
          throw error
        }

        const { data } = supabase.storage.from("verification-documents").getPublicUrl(filePath)
        uploaded[file.name] = data.publicUrl
      }
    } catch (error) {
      console.error("No se pudieron subir los documentos", error)
      toast.error("No se pudieron subir los documentos de verificación.")
      return {}
    } finally {
      setIsUploadingDocuments(false)
    }

    return uploaded
  }

  const handleAvatarSelect = (file: File) => {
    setSelectedAvatar(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleDocumentUpload = (files: File[]) => {
    if (files.length === 0) return

    setSelectedDocuments((previous) => {
      const existingNames = new Set(previous.map((file) => file.name))
      const nextFiles = files.filter((file) => !existingNames.has(file.name))
      return [...previous, ...nextFiles]
    })
  }

  const handleRemoveDocument = (fileName: string) => {
    setSelectedDocuments((previous) => previous.filter((file) => file.name !== fileName))
  }

  const handleCloseSession = async (sessionId: string) => {
    setActiveSessions((sessions) => sessions.filter((session) => session.id !== sessionId))
    toast.success("Sesión cerrada correctamente.")
  }

  const onSubmit = (values: ProfileFormValues) => {
    if (!profileId) {
      toast.error("No se encontró el usuario actual.")
      return
    }

    startTransition(async () => {
      try {
        const normalised = {
          ...values,
          full_name: values.full_name?.trim() ?? "",
          phone: values.phone?.trim() ?? "",
          avatar_url: values.avatar_url ?? "",
          address: values.address?.trim() ?? "",
          preferred_payment_method: values.preferred_payment_method ?? "",
          specialties: (values.specialties ?? []).filter((item) => item.trim().length > 0),
          service_areas: (values.service_areas ?? []).filter((item) => item.trim().length > 0),
        }

        const parsed = profileFormSchema.parse({
          ...normalised,
          full_name: normalised.full_name.length > 0 ? normalised.full_name : undefined,
          phone: normalised.phone.length > 0 ? normalised.phone : undefined,
          avatar_url: normalised.avatar_url.length > 0 ? normalised.avatar_url : undefined,
          address: normalised.address.length > 0 ? normalised.address : undefined,
        })

        const payload: Parameters<typeof updateProfile>[0] = { id: profileId }

        if (parsed.full_name || parsed.phone || parsed.avatar_url) {
          payload.profile = {}

          if (parsed.full_name) {
            payload.profile.full_name = parsed.full_name.trim()
          }

          if (parsed.phone) {
            payload.profile.phone = parsed.phone.trim()
          }
        }

        if (selectedAvatar) {
          const uploadedUrl = await uploadAvatar(profileId, selectedAvatar)
          if (uploadedUrl) {
            payload.profile = { ...(payload.profile ?? {}), avatar_url: uploadedUrl }
          }
        }

        const metadataPayload: MetadataPreferences = {
          twoFactorEnabled: parsed.twoFactorEnabled ?? false,
          emailNotifications: parsed.emailNotifications ?? true,
          pushNotifications: parsed.pushNotifications ?? true,
          smsNotifications: parsed.smsNotifications ?? false,
        }

        const metadataChanged =
          metadataPayload.twoFactorEnabled !== metadataDefaults.twoFactorEnabled ||
          metadataPayload.emailNotifications !== metadataDefaults.emailNotifications ||
          metadataPayload.pushNotifications !== metadataDefaults.pushNotifications ||
          metadataPayload.smsNotifications !== metadataDefaults.smsNotifications

        if (currentProfile?.user_type === "cliente") {
          payload.client_profile = {}

          if (parsed.address) {
            payload.client_profile.address = parsed.address.trim()
          }

          if (parsed.preferred_payment_method && parsed.preferred_payment_method.length > 0) {
            payload.client_profile.preferred_payment_method = parsed.preferred_payment_method
          }
        }

        if (currentProfile?.user_type === "tecnico") {
          payload.technician_profile = {}

          if (parsed.specialties && parsed.specialties.length > 0) {
            payload.technician_profile.specialties = parsed.specialties
          }

          if (parsed.service_areas && parsed.service_areas.length > 0) {
            payload.technician_profile.service_areas = parsed.service_areas
          }

          if (selectedDocuments.length > 0) {
            const documents = await uploadVerificationDocuments(profileId, selectedDocuments)
            if (Object.keys(documents).length > 0) {
              payload.technician_profile.verification_documents = documents
            }
          }
        }

        if (!payload.profile && !payload.client_profile && !payload.technician_profile) {
          if (metadataChanged) {
            const supabase = getSupabaseBrowserClient()
            const { error: metadataError } = await supabase.auth.updateUser({ data: metadataPayload })

            if (metadataError) {
              toast.error("Tus preferencias de seguridad y notificaciones no se pudieron actualizar.")
              return
            }

            setMetadataDefaults(metadataPayload)
            form.reset({ ...form.getValues(), ...metadataPayload })
            toast.success("Preferencias actualizadas correctamente.")
            return
          }

          toast.info("No hay cambios para guardar.")
          return
        }

        const { error, data } = await updateProfile(payload)

        if (error) {
          toast.error(Array.isArray(error) ? error.join(" ") : error)
          return
        }

        if (metadataChanged) {
          const supabase = getSupabaseBrowserClient()
          const { error: metadataError } = await supabase.auth.updateUser({ data: metadataPayload })

          if (metadataError) {
            toast.warning("Los datos se guardaron, pero no pudimos actualizar tus preferencias de notificación.")
          } else {
            setMetadataDefaults(metadataPayload)
          }
        }

        toast.success("Perfil actualizado correctamente.")
        setCurrentProfile(data ?? null)
        setSelectedDocuments([])
        setSelectedAvatar(null)

        const nextValues: ProfileFormValues = {
          ...form.getValues(),
          full_name: data?.full_name ?? parsed.full_name ?? "",
          phone: data?.phone ?? parsed.phone ?? "",
          avatar_url: data?.avatar_url ?? parsed.avatar_url ?? "",
          address: data?.client_profile?.address ?? parsed.address ?? "",
          specialties: data?.technician_profile?.specialties ?? parsed.specialties ?? [],
          service_areas: data?.technician_profile?.service_areas ?? parsed.service_areas ?? [],
          preferred_payment_method:
            data?.client_profile?.preferred_payment_method ?? parsed.preferred_payment_method ?? "",
          ...metadataPayload,
        }

        setAvatarPreview(nextValues.avatar_url ? nextValues.avatar_url : null)
        form.reset(nextValues)
      } catch (error) {
        console.error("No se pudo actualizar el perfil", error)
        const message =
          error instanceof z.ZodError
            ? error.issues.map((issue) => issue.message).join(" ")
            : "Ocurrió un error al actualizar tu perfil."
        toast.error(message)
      }
    })
  }

  const handlePasswordSubmit = passwordForm.handleSubmit(async (values) => {
    setPasswordSubmitting(true)
    try {
      const { error } = await updatePassword(values.password)
      if (error) {
        toast.error(Array.isArray(error) ? error.join(" ") : error)
        return
      }

      toast.success("Contraseña actualizada correctamente.")
      passwordForm.reset()
      setIsPasswordDialogOpen(false)
    } catch (error) {
      console.error("No se pudo actualizar la contraseña", error)
      toast.error("Ocurrió un error al actualizar la contraseña.")
    } finally {
      setPasswordSubmitting(false)
    }
  })

  const verificationDocuments: VerificationDocument[] = useMemo(() => {
    const documents = currentProfile?.technician_profile?.verification_documents ?? {}
    return Object.entries(documents)
      .filter(([, value]) => typeof value === "string" && value.length > 0)
      .map(([name, value]) => ({
        name,
        url: value as string,
      }))
  }, [currentProfile])

  const technicianLocation = currentProfile?.technician_profile?.current_location ?? null
  const technicianRating = currentProfile?.technician_profile?.rating ?? 0
  const technicianServices = currentProfile?.technician_profile?.total_services ?? 0
  const clientRequests = currentProfile?.client_profile?.total_requests ?? 0
  const isClient = currentProfile?.user_type === "cliente"
  const isTechnician = currentProfile?.user_type === "tecnico"
  const userTypeLabel = isClient ? "Cliente" : isTechnician ? "Técnico" : "General"
  const unsavedChanges = form.formState.isDirty || selectedAvatar !== null || selectedDocuments.length > 0

  if (isFetching) {
    return (
      <AppShell>
        <div className="flex h-full items-center justify-center bg-gradient-to-br from-white via-[#F5F3FF] to-[#EDE9FE]">
          <div className="flex items-center gap-3 rounded-2xl bg-white px-6 py-4 shadow-xl">
            <Loader2 className="h-5 w-5 animate-spin text-[#8B5CF6]" />
            <span className="text-sm font-medium text-slate-600">Cargando tu perfil…</span>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="flex h-full flex-col overflow-y-auto bg-gradient-to-br from-white via-[#F5F3FF] to-[#EDE9FE] p-6">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
          <header className="flex flex-col gap-4 rounded-3xl border border-[#8B5CF6]/10 bg-white/80 p-6 shadow-[0_24px_60px_rgba(91,33,182,0.12)] backdrop-blur">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">Mi perfil</h1>
                <p className="text-sm text-slate-500">
                  Gestiona tu información personal, preferencias y seguridad de tu cuenta.
                </p>
              </div>
              {unsavedChanges && (
                <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-700">
                  • Cambios sin guardar
                </span>
              )}
            </div>
          </header>

          <Tabs.Root defaultValue="general" className="space-y-6">
            <Tabs.List className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white/80 p-2 backdrop-blur">
              <Tabs.Trigger
                value="general"
                className="rounded-xl px-4 py-2 text-sm font-medium data-[state=active]:bg-[#8B5CF6] data-[state=active]:text-white data-[state=inactive]:text-slate-600"
              >
                Información general
              </Tabs.Trigger>
              {isClient && (
                <Tabs.Trigger
                  value="cliente"
                  className="rounded-xl px-4 py-2 text-sm font-medium data-[state=active]:bg-[#8B5CF6] data-[state=active]:text-white data-[state=inactive]:text-slate-600"
                >
                  Información de cliente
                </Tabs.Trigger>
              )}
              {isTechnician && (
                <Tabs.Trigger
                  value="tecnico"
                  className="rounded-xl px-4 py-2 text-sm font-medium data-[state=active]:bg-[#8B5CF6] data-[state=active]:text-white data-[state=inactive]:text-slate-600"
                >
                  Información de técnico
                </Tabs.Trigger>
              )}
              <Tabs.Trigger
                value="seguridad"
                className="rounded-xl px-4 py-2 text-sm font-medium data-[state=active]:bg-[#8B5CF6] data-[state=active]:text-white data-[state=inactive]:text-slate-600"
              >
                Seguridad
              </Tabs.Trigger>
              <Tabs.Trigger
                value="notificaciones"
                className="rounded-xl px-4 py-2 text-sm font-medium data-[state=active]:bg-[#8B5CF6] data-[state=active]:text-white data-[state=inactive]:text-slate-600"
              >
                Notificaciones
              </Tabs.Trigger>
            </Tabs.List>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Tabs.Content value="general">
                  <GeneralInfoSection
                    form={form}
                    avatarPreview={avatarPreview}
                    onAvatarSelect={handleAvatarSelect}
                    email={currentProfile?.email ?? ""}
                    userTypeLabel={userTypeLabel}
                    disableAvatar={isPending}
                  />
                </Tabs.Content>

                {isClient && (
                  <Tabs.Content value="cliente">
                    <ClientInfoSection
                      form={form}
                      paymentMethods={PAYMENT_METHODS}
                      serviceHistory={clientRequests}
                    />
                  </Tabs.Content>
                )}

                {isTechnician && (
                  <Tabs.Content value="tecnico">
                    <TechnicianInfoSection
                      form={form}
                      specialtyOptions={SPECIALTY_OPTIONS}
                      serviceAreaOptions={SERVICE_AREAS}
                      isVerified={currentProfile?.technician_profile?.is_verified ?? false}
                      documents={verificationDocuments}
                      onUploadDocuments={handleDocumentUpload}
                      onRemoveDocument={handleRemoveDocument}
                      isUploading={isUploadingDocuments}
                      selectedDocuments={selectedDocuments}
                      location={technicianLocation}
                      rating={technicianRating}
                      totalServices={technicianServices}
                    />
                  </Tabs.Content>
                )}

                <Tabs.Content value="seguridad">
                  <SecuritySection
                    form={form}
                    onOpenPasswordDialog={() => setIsPasswordDialogOpen(true)}
                    sessions={activeSessions}
                    onCloseSession={handleCloseSession}
                  />
                </Tabs.Content>

                <Tabs.Content value="notificaciones">
                  <NotificationsSection form={form} />
                </Tabs.Content>

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      form.reset({
                        full_name: currentProfile?.full_name ?? "",
                        phone: currentProfile?.phone ?? "",
                        avatar_url: currentProfile?.avatar_url ?? "",
                        address: currentProfile?.client_profile?.address ?? "",
                        specialties: currentProfile?.technician_profile?.specialties ?? [],
                        service_areas: currentProfile?.technician_profile?.service_areas ?? [],
                        preferred_payment_method: currentProfile?.client_profile?.preferred_payment_method ?? "",
                        twoFactorEnabled: metadataDefaults.twoFactorEnabled,
                        emailNotifications: metadataDefaults.emailNotifications,
                        pushNotifications: metadataDefaults.pushNotifications,
                        smsNotifications: metadataDefaults.smsNotifications,
                      })
                      setSelectedAvatar(null)
                      setSelectedDocuments([])
                      setAvatarPreview(currentProfile?.avatar_url ?? null)
                    }}
                    disabled={isPending}
                  >
                    Deshacer cambios
                  </Button>
                  <Button type="submit" disabled={isPending || isUploadingDocuments} className="gap-2">
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Guardar cambios
                  </Button>
                </div>
              </form>
            </Form>
          </Tabs.Root>
        </div>
      </div>

      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar contraseña</DialogTitle>
            <DialogDescription>
              Ingresa una nueva contraseña segura para proteger tu cuenta.
            </DialogDescription>
          </DialogHeader>
          <Form {...passwordForm}>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Nueva contraseña"
                  {...passwordForm.register("password")}
                  autoComplete="new-password"
                />
                {passwordForm.formState.errors.password ? (
                  <p className="text-sm font-medium text-red-500">
                    {passwordForm.formState.errors.password.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Confirma tu contraseña"
                  {...passwordForm.register("confirmPassword")}
                  autoComplete="new-password"
                />
                {passwordForm.formState.errors.confirmPassword ? (
                  <p className="text-sm font-medium text-red-500">
                    {passwordForm.formState.errors.confirmPassword.message}
                  </p>
                ) : null}
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPasswordDialogOpen(false)}
                  disabled={passwordSubmitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={passwordSubmitting} className="gap-2">
                  {passwordSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Actualizar contraseña
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}

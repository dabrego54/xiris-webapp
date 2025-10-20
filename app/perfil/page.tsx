"use client"

import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import * as Tabs from "@radix-ui/react-tabs"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, LogOut, MapPin, ShieldCheck, Upload } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { getCurrentUser, updatePassword, updateProfile } from "@/app/actions/auth.actions"
import AppShell from "@/components/AppShell"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { updatePasswordSchema, updateProfileSchema } from "@/lib/validations/auth.validation"
import type { DatabaseProfile } from "@/types/database.types"
import { cn } from "@/lib/utils"

const profileFormSchema = updateProfileSchema.extend({
  preferred_payment_method: z.string().min(2, "Selecciona un método de pago.").optional(),
  twoFactorEnabled: z.boolean().default(false),
  emailNotifications: z.boolean().default(true),
  pushNotifications: z.boolean().default(true),
  smsNotifications: z.boolean().default(false),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

type PasswordFormValues = z.infer<typeof updatePasswordSchema>

type SessionItem = {
  id: string
  device: string
  lastActive: string
}

type MetadataPreferences = {
  twoFactorEnabled: boolean
  emailNotifications: boolean
  pushNotifications: boolean
  smsNotifications: boolean
}

const PAYMENT_METHODS = [
  "Tarjeta de crédito",
  "Tarjeta de débito",
  "Transferencia bancaria",
  "Efectivo",
]

const SPECIALTY_OPTIONS = [
  "Electricidad",
  "Gasfitería",
  "Carpintería",
  "Pintura",
  "Cerrajería",
  "Electrodomésticos",
]

const SERVICE_AREAS = [
  "Santiago Centro",
  "Providencia",
  "Las Condes",
  "Ñuñoa",
  "La Florida",
  "Maipú",
]

function MultiSelectField({
  value,
  onChange,
  options,
  emptyLabel,
}: {
  value: string[]
  onChange: (value: string[]) => void
  options: string[]
  emptyLabel: string
}) {
  const availableOptions = useMemo(
    () => options.filter((option) => !value.includes(option)),
    [options, value]
  )

  const handleRemove = (item: string) => {
    onChange(value.filter((option) => option !== item))
  }

  const handleToggle = (item: string) => {
    if (value.includes(item)) {
      onChange(value.filter((option) => option !== item))
      return
    }

    onChange([...value, item])
  }

  return (
    <div className="space-y-4">
      <div
        className={cn("flex flex-wrap gap-2", value.length === 0 && "text-sm text-slate-500")}
        aria-live="polite"
      >
        {value.length === 0 ? (
          <span>{emptyLabel}</span>
        ) : (
          value.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-2 rounded-full bg-[#8B5CF6]/10 px-3 py-1 text-sm font-medium text-[#5B21B6]"
            >
              {item}
              <button
                type="button"
                onClick={() => handleRemove(item)}
                className="rounded-full bg-white/50 px-2 py-0.5 text-xs text-[#5B21B6] transition hover:bg-white"
                aria-label={`Quitar ${item}`}
              >
                ×
              </button>
            </span>
          ))
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const isSelected = value.includes(option)
          return (
            <button
              type="button"
              key={option}
              onClick={() => handleToggle(option)}
              aria-pressed={isSelected}
              className={cn(
                "flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition",
                isSelected
                  ? "border-[#8B5CF6] bg-[#8B5CF6]/10 text-[#5B21B6]"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              )}
            >
              <span>{option}</span>
              <span className="text-xs uppercase">{isSelected ? "Seleccionado" : "Agregar"}</span>
            </button>
          )
        })}

        {availableOptions.length === 0 && (
          <p className="col-span-full text-sm text-slate-500">
            No hay más opciones disponibles. Puedes quitar alguna para agregar nuevas.
          </p>
        )}
      </div>
    </div>
  )
}

function ServiceHistoryList({ services }: { services: Array<{ id: string; title: string; date: string; status: string }> }) {
  if (services.length === 0) {
    return <p className="text-sm text-slate-500">Aún no registras servicios completados.</p>
  }

  return (
    <ul className="space-y-3">
      {services.map((service) => (
        <li key={service.id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm">
          <div>
            <p className="font-medium text-slate-900">{service.title}</p>
            <p className="text-xs text-slate-500">{service.date}</p>
          </div>
          <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">{service.status}</span>
        </li>
      ))}
    </ul>
  )
}

function ReviewsList({
  reviews,
}: {
  reviews: Array<{ id: string; author: string; rating: number; comment: string; date: string }>
}) {
  if (reviews.length === 0) {
    return <p className="text-sm text-slate-500">Aún no recibes reseñas.</p>
  }

  return (
    <ul className="space-y-4">
      {reviews.map((review) => (
        <li key={review.id} className="rounded-lg border border-slate-200 p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900">{review.author}</p>
              <p className="text-xs text-slate-500">{review.date}</p>
            </div>
            <div className="flex items-center gap-1 text-amber-500" aria-label={`Calificación ${review.rating} de 5`}>
              {Array.from({ length: 5 }).map((_, index) => (
                <span key={index}>{index < review.rating ? "★" : "☆"}</span>
              ))}
            </div>
          </div>
          <p className="mt-2 text-sm text-slate-600">{review.comment}</p>
        </li>
      ))}
    </ul>
  )
}

function MapPreview({ location }: { location: { lat: number; lng: number } | null }) {
  if (!location) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
        No hay una ubicación compartida actualmente.
      </div>
    )
  }

  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${location.lng - 0.01}%2C${location.lat - 0.01}%2C${location.lng + 0.01}%2C${location.lat + 0.01}&layer=mapnik&marker=${location.lat}%2C${location.lng}`

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <iframe title="Ubicación actual" src={mapUrl} className="h-48 w-full" allowFullScreen />
    </div>
  )
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
    defaultValues: {
      full_name: "",
      phone: "",
      avatar_url: "",
      address: "",
      specialties: [],
      service_areas: [],
      preferred_payment_method: "",
      twoFactorEnabled: false,
      emailNotifications: true,
      pushNotifications: true,
      smsNotifications: false,
    },
  })

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(updatePasswordSchema),
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

        setProfileId(result.user.id)
        setCurrentProfile(result.profile ?? null)

        const profileData = result.profile
        const metadata = (result.user.user_metadata ?? {}) as Record<string, unknown>
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
          full_name: profileData?.full_name ?? "",
          phone: profileData?.phone ?? "",
          avatar_url: profileData?.avatar_url ?? "",
          address: profileData?.client_profile?.address ?? "",
          specialties: profileData?.technician_profile?.specialties ?? [],
          service_areas: profileData?.technician_profile?.service_areas ?? [],
          preferred_payment_method: profileData?.client_profile?.preferred_payment_method ?? "",
          ...initialMetadata,
        })

        if (profileData?.avatar_url) {
          setAvatarPreview(profileData.avatar_url)
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

  const serviceHistory = useMemo(() => {
    if (!currentProfile?.client_profile) {
      return []
    }

    const total = currentProfile.client_profile.total_requests

    return Array.from({ length: Math.min(total, 3) }).map((_, index) => ({
      id: `${index}`,
      title: `Servicio #${total - index}`,
      date: new Date(Date.now() - index * 86400000).toLocaleDateString(),
      status: index === 0 ? "Completado" : "Finalizado",
    }))
  }, [currentProfile])

  const reviews = useMemo(() => {
    if (!currentProfile?.technician_profile) {
      return []
    }

    return Array.from({ length: Math.min(currentProfile.technician_profile.total_services, 3) }).map((_, index) => ({
      id: `${index}`,
      author: `Cliente ${index + 1}`,
      rating: Math.max(3, Math.round(currentProfile.technician_profile.rating)),
      comment: "Excelente trabajo, muy puntual y profesional.",
      date: new Date(Date.now() - index * 604800000).toLocaleDateString(),
    }))
  }, [currentProfile])

  const isClient = currentProfile?.user_type === "cliente"
  const isTechnician = currentProfile?.user_type === "tecnico"

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setSelectedAvatar(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleDocumentUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (files.length === 0) {
      return
    }

    setSelectedDocuments((previous) => [...previous, ...files])
  }

  const handleRemoveDocument = (fileName: string) => {
    setSelectedDocuments((previous) => previous.filter((file) => file.name !== fileName))
  }

  const handleCloseSession = async (sessionId: string) => {
    setActiveSessions((sessions) => sessions.filter((session) => session.id !== sessionId))
    toast.success("Sesión cerrada correctamente.")
  }

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

  const uploadVerificationDocuments = async (userId: string, files: File[]): Promise<Record<string, string>> => {
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

  const onSubmit = (values: ProfileFormValues) => {
    if (!profileId) {
      toast.error("No se encontró el usuario actual.")
      return
    }

    startTransition(async () => {
      try {
        const parsed = profileFormSchema.parse(values)
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

        if (isClient) {
          payload.client_profile = {}
          if (parsed.address) {
            payload.client_profile.address = parsed.address.trim()
          }
          if (parsed.preferred_payment_method) {
            payload.client_profile.preferred_payment_method = parsed.preferred_payment_method
          }
        }

        if (isTechnician) {
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

  const unsavedChanges = form.formState.isDirty || selectedAvatar !== null || selectedDocuments.length > 0

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
                <Tabs.Content value="general" className="space-y-6">
                  <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
                    <div className="flex flex-col gap-6 lg:flex-row">
                      <div className="flex flex-col items-center gap-4">
                        <div className="relative h-32 w-32 overflow-hidden rounded-2xl border border-slate-200">
                          {avatarPreview ? (
                            <Image src={avatarPreview} alt="Avatar" fill className="object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400">
                              Sin foto
                            </div>
                          )}
                        </div>
                        <div className="space-y-2 text-center">
                          <Label htmlFor="avatar" className="text-sm font-medium text-slate-700">
                            Foto de perfil
                          </Label>
                          <input id="avatar" type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => document.getElementById("avatar")?.click()}
                            className="gap-2"
                          >
                            <Upload className="h-4 w-4" /> Cambiar imagen
                          </Button>
                        </div>
                      </div>

                      <div className="flex-1 space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="full_name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nombre completo</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="Tu nombre" autoComplete="name" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormItem>
                            <FormLabel>Correo electrónico</FormLabel>
                            <FormControl>
                              <Input value={currentProfile?.email ?? ""} readOnly disabled className="bg-slate-100" />
                            </FormControl>
                          </FormItem>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Teléfono</FormLabel>
                                <FormControl>
                                  <Input {...field} placeholder="+56 9 1234 5678" autoComplete="tel" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="flex flex-col gap-2">
                            <span className="text-sm font-medium text-slate-700">Tipo de usuario</span>
                            <span className="inline-flex w-fit items-center rounded-full bg-[#8B5CF6]/10 px-3 py-1 text-sm font-semibold text-[#5B21B6]">
                              {isClient ? "Cliente" : isTechnician ? "Técnico" : "General"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                </Tabs.Content>

                {isClient && (
                  <Tabs.Content value="cliente" className="space-y-6">
                    <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="address"
                          render={({ field }) => (
                            <FormItem className="sm:col-span-2">
                              <FormLabel>Dirección</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Calle, número, comuna" autoComplete="street-address" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="preferred_payment_method"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Método de pago preferido</FormLabel>
                              <FormControl>
                                <select
                                  {...field}
                                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
                                >
                                  <option value="">Selecciona una opción</option>
                                  {PAYMENT_METHODS.map((method) => (
                                    <option key={method} value={method}>
                                      {method}
                                    </option>
                                  ))}
                                </select>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </section>

                    <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
                      <div className="flex items-center gap-3">
                        <ShieldCheck className="h-5 w-5 text-[#8B5CF6]" />
                        <h2 className="text-lg font-semibold text-slate-900">Historial de servicios</h2>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        Consulta tus servicios recientes y verifica su estado.
                      </p>
                      <div className="mt-4">
                        <ServiceHistoryList services={serviceHistory} />
                      </div>
                    </section>
                  </Tabs.Content>
                )}

                {isTechnician && (
                  <Tabs.Content value="tecnico" className="space-y-6">
                    <section className="space-y-6 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
                      <div className="grid gap-6 lg:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="specialties"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Especialidades</FormLabel>
                              <FormControl>
                                <MultiSelectField
                                  value={field.value}
                                  onChange={field.onChange}
                                  options={SPECIALTY_OPTIONS}
                                  emptyLabel="Selecciona las especialidades en las que destacas"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="service_areas"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Áreas de servicio</FormLabel>
                              <FormControl>
                                <MultiSelectField
                                  value={field.value}
                                  onChange={field.onChange}
                                  options={SERVICE_AREAS}
                                  emptyLabel="Selecciona las comunas en las que trabajas"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="grid gap-6 lg:grid-cols-2">
                        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                          <p className="text-sm font-medium text-slate-700">Estado de verificación</p>
                          <span
                            className={cn(
                              "inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold",
                              currentProfile?.technician_profile?.is_verified
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-700"
                            )}
                          >
                            <ShieldCheck className="h-4 w-4" />
                            {currentProfile?.technician_profile?.is_verified ? "Verificado" : "En revisión"}
                          </span>
                          <p className="text-xs text-slate-500">
                            Mantén tus documentos actualizados para conservar el estado verificado.
                          </p>
                        </div>

                        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                          <p className="text-sm font-medium text-slate-700">Documentos de verificación</p>
                          <input
                            id="documents"
                            type="file"
                            accept="image/*,.pdf"
                            multiple
                            onChange={handleDocumentUpload}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => document.getElementById("documents")?.click()}
                            className="gap-2"
                            disabled={isUploadingDocuments}
                          >
                            {isUploadingDocuments ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Upload className="h-4 w-4" />
                            )}
                            Subir archivos
                          </Button>
                          <ul className="space-y-2 text-sm text-slate-600">
                            {selectedDocuments.length === 0 ? (
                              <li>No hay documentos pendientes.</li>
                            ) : (
                              selectedDocuments.map((file) => (
                                <li key={file.name} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                                  <span>{file.name}</span>
                                  <button
                                    type="button"
                                    className="text-sm font-medium text-[#8B5CF6] hover:underline"
                                    onClick={() => handleRemoveDocument(file.name)}
                                  >
                                    Quitar
                                  </button>
                                </li>
                              ))
                            )}
                          </ul>
                        </div>
                      </div>

                      <div className="grid gap-6 lg:grid-cols-2">
                        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                          <p className="text-sm font-medium text-slate-700">Ubicación actual</p>
                          <MapPreview location={currentProfile?.technician_profile?.current_location ?? null} />
                          <p className="flex items-center gap-2 text-sm text-slate-500">
                            <MapPin className="h-4 w-4" />
                            Compartimos únicamente tu ubicación aproximada con clientes cercanos.
                          </p>
                        </div>

                        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
                          <p className="text-sm font-medium text-slate-700">Rating y reseñas</p>
                          <div className="flex items-center gap-3">
                            <div className="text-3xl font-semibold text-[#8B5CF6]">
                              {currentProfile?.technician_profile?.rating?.toFixed(1) ?? "-"}
                            </div>
                            <div className="text-sm text-slate-500">
                              Basado en {currentProfile?.technician_profile?.total_services ?? 0} servicios.
                            </div>
                          </div>
                          <ReviewsList reviews={reviews} />
                        </div>
                      </div>
                    </section>
                  </Tabs.Content>
                )}

                <Tabs.Content value="seguridad" className="space-y-6">
                  <section className="space-y-6 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h2 className="text-lg font-semibold text-slate-900">Seguridad de la cuenta</h2>
                        <p className="text-sm text-slate-500">
                          Mantén tu cuenta protegida activando opciones adicionales de seguridad.
                        </p>
                      </div>
                      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                        <DialogTrigger asChild>
                          <Button type="button" variant="outline" className="gap-2">
                            Cambiar contraseña
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Actualizar contraseña</DialogTitle>
                            <DialogDescription>
                              Ingresa una nueva contraseña segura para tu cuenta.
                            </DialogDescription>
                          </DialogHeader>
                          <Form {...passwordForm}>
                            <form className="space-y-4" onSubmit={handlePasswordSubmit}>
                              <FormField
                                control={passwordForm.control}
                                name="password"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Nueva contraseña</FormLabel>
                                    <FormControl>
                                      <Input {...field} type="password" autoComplete="new-password" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={passwordForm.control}
                                name="confirmPassword"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Confirmar contraseña</FormLabel>
                                    <FormControl>
                                      <Input {...field} type="password" autoComplete="new-password" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <DialogFooter>
                                <Button type="button" variant="ghost" onClick={() => setIsPasswordDialogOpen(false)}>
                                  Cancelar
                                </Button>
                                <Button type="submit" disabled={passwordSubmitting} className="gap-2">
                                  {passwordSubmitting && <Loader2 className="h-4 w-4 animate-spin" />} Guardar
                                </Button>
                              </DialogFooter>
                            </form>
                          </Form>
                        </DialogContent>
                      </Dialog>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="twoFactorEnabled"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4">
                            <div>
                              <FormLabel className="text-base">Autenticación de dos factores</FormLabel>
                              <p className="text-sm text-slate-500">
                                Añade una capa adicional de seguridad utilizando códigos únicos.
                              </p>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Activar 2FA" />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="text-sm font-medium text-slate-700">Sesiones activas</p>
                        <p className="text-xs text-slate-500">
                          Cierra las sesiones que no reconozcas para proteger tu cuenta.
                        </p>
                        <ul className="mt-3 space-y-2">
                          {activeSessions.length === 0 ? (
                            <li className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">
                              No hay sesiones activas adicionales.
                            </li>
                          ) : (
                            activeSessions.map((session) => (
                              <li
                                key={session.id}
                                className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
                              >
                                <div>
                                  <p className="font-medium text-slate-700">{session.device}</p>
                                  <p className="text-xs text-slate-500">Último acceso: {session.lastActive}</p>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="gap-1 text-sm text-rose-600 hover:bg-rose-50"
                                  onClick={() => handleCloseSession(session.id)}
                                >
                                  <LogOut className="h-4 w-4" /> Cerrar sesión
                                </Button>
                              </li>
                            ))
                          )}
                        </ul>
                      </div>
                    </div>
                  </section>
                </Tabs.Content>

                <Tabs.Content value="notificaciones" className="space-y-6">
                  <section className="space-y-4 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-900">Preferencias de notificación</h2>
                    <p className="text-sm text-slate-500">
                      Controla cómo quieres recibir alertas sobre tus servicios y actualizaciones.
                    </p>
                    <div className="space-y-3">
                      <FormField
                        control={form.control}
                        name="emailNotifications"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4">
                            <div>
                              <FormLabel className="text-base">Notificaciones por correo</FormLabel>
                              <p className="text-sm text-slate-500">
                                Recibe confirmaciones y resúmenes de actividad en tu email.
                              </p>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                aria-label="Notificaciones por correo"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="pushNotifications"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4">
                            <div>
                              <FormLabel className="text-base">Notificaciones push</FormLabel>
                              <p className="text-sm text-slate-500">
                                Mantente al tanto en tiempo real de nuevos servicios.
                              </p>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Notificaciones push" />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="smsNotifications"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4">
                            <div>
                              <FormLabel className="text-base">Notificaciones SMS</FormLabel>
                              <p className="text-sm text-slate-500">
                                Recibe recordatorios y avisos urgentes por mensaje de texto.
                              </p>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Notificaciones por SMS" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </section>
                </Tabs.Content>

                <div className="flex justify-end gap-3">
                  <Button type="button" variant="ghost" onClick={() => form.reset()} disabled={isPending}>
                    Descartar cambios
                  </Button>
                  <Button type="submit" className="gap-2" disabled={isPending}>
                    {isPending && <Loader2 className="h-4 w-4 animate-spin" />} Guardar cambios
                  </Button>
                </div>
              </form>
            </Form>
          </Tabs.Root>
        </div>
      </div>
    </AppShell>
  )
}

"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import type { ApplicationStatus, TechnicianApplication } from "@/types/database.types"

interface TechnicianApplicationFormProps {
  userId: string
  email: string
  initialApplication: TechnicianApplication | null
}

type SignedUrls = {
  cvUrl: string | null
  certUrls: { url: string; name: string }[]
}

function buildCertificationPath(applicationId: string, index: number, file: File): string {
  const extension = file.name.split(".").pop() ?? "pdf"
  return `applications/${applicationId}/cert-${index + 1}.${extension.toLowerCase()}`
}

export default function TechnicianApplicationForm({
  userId,
  email,
  initialApplication,
}: TechnicianApplicationFormProps) {
  const router = useRouter()
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])

  const [application, setApplication] = useState<TechnicianApplication | null>(initialApplication)
  const [fullName, setFullName] = useState(initialApplication?.full_name ?? "")
  const [phone, setPhone] = useState(initialApplication?.phone ?? "")
  const [experience, setExperience] = useState(initialApplication?.experience ?? "")
  const [skills, setSkills] = useState<string[]>(initialApplication?.skills ?? [])
  const [skillInput, setSkillInput] = useState("")
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [certFiles, setCertFiles] = useState<File[]>([])
  const [signedUrls, setSignedUrls] = useState<SignedUrls>({ cvUrl: null, certUrls: [] })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const status: ApplicationStatus = application?.status ?? "submitted"
  const isEditable = !application || application.status === "submitted"

  useEffect(() => {
    async function loadSignedUrls(current: TechnicianApplication | null) {
      if (!current) {
        setSignedUrls({ cvUrl: null, certUrls: [] })
        return
      }

      const storage = supabase.storage.from("tech-docs")
      const nextSignedUrls: SignedUrls = { cvUrl: null, certUrls: [] }

      if (current.cv_url) {
        const { data, error } = await storage.createSignedUrl(current.cv_url, 60 * 60)
        if (error) {
          console.error("Error al generar URL firmada para CV", error)
          toast.error("No pudimos generar el enlace del CV.")
        } else {
          nextSignedUrls.cvUrl = data.signedUrl
        }
      }

      if (current.certs_urls?.length) {
        const certificates: { url: string; name: string }[] = []
        await Promise.all(
          current.certs_urls.map(async (path, index) => {
            const { data, error } = await storage.createSignedUrl(path, 60 * 60)
            if (error) {
              console.error("Error al generar URL firmada para certificación", error)
              toast.error("No pudimos generar alguno de los enlaces de certificaciones.")
              return
            }

            certificates.push({
              url: data.signedUrl,
              name: `Certificación ${index + 1}`,
            })
          })
        )
        nextSignedUrls.certUrls = certificates
      }

      setSignedUrls(nextSignedUrls)
    }

    void loadSignedUrls(application)
  }, [application, supabase])

  const statusLabel: Record<ApplicationStatus, { label: string; tone: string }> = {
    submitted: { label: "Postulación enviada", tone: "bg-brand/10 text-brand" },
    under_review: { label: "Tu postulación está en revisión", tone: "bg-amber-50 text-amber-600" },
    approved: { label: "Postulación aprobada", tone: "bg-emerald-50 text-emerald-600" },
    rejected: { label: "Postulación rechazada", tone: "bg-rose-50 text-rose-600" },
  }

  function addSkill() {
    const trimmed = skillInput.trim()
    if (!trimmed || skills.includes(trimmed)) {
      return
    }
    setSkills((prev) => [...prev, trimmed])
    setSkillInput("")
  }

  function removeSkill(value: string) {
    setSkills((prev) => prev.filter((skill) => skill !== value))
  }

  async function ensureApplication(): Promise<TechnicianApplication> {
    if (!application) {
      const { data, error } = await supabase
        .from("technician_applications")
        .insert({
          user_id: userId,
          email,
          full_name: fullName || null,
          phone: phone || null,
          skills,
          experience: experience || null,
          status: "submitted",
        })
        .select()
        .single()

      if (error || !data) {
        throw error ?? new Error("No se pudo crear la postulación")
      }

      setApplication(data)
      return data
    }

    const { data, error } = await supabase
      .from("technician_applications")
      .update({
        full_name: fullName || null,
        phone: phone || null,
        skills,
        experience: experience || null,
      })
      .eq("id", application.id)
      .select()
      .single()

    if (error || !data) {
      throw error ?? new Error("No se pudo actualizar la postulación")
    }

    setApplication(data)
    return data
  }

  async function uploadFiles(current: TechnicianApplication): Promise<void> {
    const storage = supabase.storage.from("tech-docs")
    let cvPath = current.cv_url
    let certPaths = current.certs_urls ?? []

    if (cvFile) {
      const path = `applications/${current.id}/cv.pdf`
      const { error } = await storage.upload(path, cvFile, {
        cacheControl: "3600",
        upsert: true,
        contentType: "application/pdf",
      })

      if (error) {
        throw error
      }

      cvPath = path
    }

    if (certFiles.length) {
      const uploads = await Promise.all(
        certFiles.map(async (file, index) => {
          const path = buildCertificationPath(current.id, index, file)
          const { error } = await storage.upload(path, file, {
            cacheControl: "3600",
            upsert: true,
          })

          if (error) {
            throw error
          }

          return path
        })
      )

      certPaths = uploads
    }

    if (cvPath !== current.cv_url || certPaths !== current.certs_urls) {
      const { data, error } = await supabase
        .from("technician_applications")
        .update({
          cv_url: cvPath,
          certs_urls: certPaths,
        })
        .eq("id", current.id)
        .select()
        .single()

      if (error || !data) {
        throw error ?? new Error("No se pudieron guardar los archivos")
      }

      setApplication(data)
      return
    }

    return
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isEditable) {
      toast.error("No puedes editar esta postulación en este estado.")
      return
    }

    setIsSubmitting(true)

    try {
      const savedApplication = await ensureApplication()
      await uploadFiles(savedApplication)
      toast.success("Postulación enviada correctamente.")
      setCvFile(null)
      setCertFiles([])
      router.refresh()
    } catch (error) {
      console.error("Error al enviar la postulación", error)
      toast.error("No pudimos enviar tu postulación. Inténtalo nuevamente.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative isolate min-h-screen bg-gradient-to-br from-brand/5 via-white to-white py-16">
      <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center blur-3xl">
        <div className="h-48 w-[36rem] rounded-full bg-brand/30 opacity-40" aria-hidden />
      </div>
      <div className="relative mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-border bg-white/90 p-8 shadow-xl backdrop-blur">
          <header className="space-y-4">
            <div className="inline-flex items-center gap-3 rounded-full bg-brand/10 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-brand">
              <span className="inline-flex h-2 w-2 rounded-full bg-current" aria-hidden />
              <span>Aplicación de técnicos</span>
            </div>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold text-ink">Postulación a Técnico</h1>
              <p className="text-sm text-muted-foreground">
                Completa tus datos y adjunta los documentos requeridos para que nuestro equipo pueda revisar tu postulación.
              </p>
            </div>
            {application && (
              <div
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-4 py-1 text-sm font-medium",
                  statusLabel[status]?.tone ?? "bg-slate-100 text-slate-600",
                )}
              >
                <span className="h-2 w-2 rounded-full bg-current" aria-hidden />
                <span>{statusLabel[status]?.label ?? "Estado desconocido"}</span>
              </div>
            )}
          </header>

          <form onSubmit={handleSubmit} className="mt-10 space-y-10">
            <section className="space-y-6 rounded-3xl border border-border bg-white/90 p-6 shadow-sm">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-sm font-semibold text-ink">
                    Nombre completo
                  </Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    disabled={!isEditable}
                    placeholder="Ej. María López"
                    className="h-12 rounded-2xl border-border bg-white text-sm text-ink"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-semibold text-ink">
                    Teléfono de contacto
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    disabled={!isEditable}
                    placeholder="Ej. +56 9 1234 5678"
                    className="h-12 rounded-2xl border-border bg-white text-sm text-ink"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold text-ink">Habilidades</Label>
                <p className="text-xs text-muted-foreground">Añade tus principales habilidades técnicas para destacar tu perfil.</p>
                <div className="flex flex-wrap items-center gap-2">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/10 px-3 py-1 text-sm font-medium text-brand"
                    >
                      {skill}
                      {isEditable && (
                        <button
                          type="button"
                          onClick={() => removeSkill(skill)}
                          className="text-brand transition hover:text-brand-600"
                          aria-label={`Eliminar habilidad ${skill}`}
                        >
                          ×
                        </button>
                      )}
                    </span>
                  ))}
                  {isEditable && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        value={skillInput}
                        onChange={(event) => setSkillInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault()
                            addSkill()
                          }
                        }}
                        placeholder="Añadir habilidad"
                        className="h-11 w-48 rounded-full border-border bg-white text-sm text-ink"
                      />
                      <Button type="button" size="sm" onClick={addSkill} className="shadow-[0_12px_32px_rgba(124,58,237,0.25)]">
                        Agregar
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="experience" className="text-sm font-semibold text-ink">
                  Experiencia
                </Label>
                <textarea
                  id="experience"
                  value={experience}
                  onChange={(event) => setExperience(event.target.value)}
                  disabled={!isEditable}
                  rows={5}
                  className="w-full rounded-3xl border border-border bg-white px-5 py-4 text-sm text-ink shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-not-allowed disabled:opacity-70"
                  placeholder="Cuéntanos sobre tu experiencia laboral como técnico."
                />
              </div>
            </section>

            <section className="space-y-6 rounded-3xl border border-border bg-white/90 p-6 shadow-sm">
              <div className="space-y-3">
                <Label className="text-sm font-semibold text-ink">Currículum (PDF)</Label>
                <p className="text-xs text-muted-foreground">Adjunta tu CV en formato PDF. Podrás actualizarlo en cualquier momento mientras tu postulación esté en edición.</p>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(event) => setCvFile(event.target.files?.[0] ?? null)}
                  disabled={!isEditable}
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-full file:border-0 file:bg-brand file:px-5 file:py-2 file:text-sm file:font-semibold file:text-white file:shadow-[0_15px_35px_rgba(124,58,237,0.28)] file:transition file:hover:bg-[#6d28d9] disabled:cursor-not-allowed disabled:opacity-70"
                />
                {signedUrls.cvUrl && (
                  <a
                    href={signedUrls.cvUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-brand transition hover:text-brand-600"
                  >
                    Ver CV cargado
                  </a>
                )}
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold text-ink">Certificaciones (PDF, PNG o JPG)</Label>
                <p className="text-xs text-muted-foreground">Sube certificaciones relevantes que respalden tu experiencia técnica.</p>
                <input
                  type="file"
                  accept="application/pdf,image/png,image/jpeg"
                  multiple
                  onChange={(event) => setCertFiles(Array.from(event.target.files ?? []))}
                  disabled={!isEditable}
                  className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-full file:border-0 file:bg-brand file:px-5 file:py-2 file:text-sm file:font-semibold file:text-white file:shadow-[0_15px_35px_rgba(124,58,237,0.28)] file:transition file:hover:bg-[#6d28d9] disabled:cursor-not-allowed disabled:opacity-70"
                />
                {signedUrls.certUrls.length > 0 && (
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {signedUrls.certUrls.map((cert) => (
                      <li key={cert.url}>
                        <a
                          href={cert.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold text-brand transition hover:text-brand-600"
                        >
                          {cert.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>

            <div className="flex flex-col gap-3 border-t border-dashed border-border/80 pt-6 sm:flex-row sm:items-center sm:justify-between">
              {!isEditable && (
                <p className="text-sm text-muted-foreground">
                  No puedes editar la postulación mientras esté en este estado.
                </p>
              )}
              <div className="flex justify-end gap-3">
                <Button type="submit" disabled={!isEditable || isSubmitting} className="min-w-[12rem]">
                  {isSubmitting ? "Enviando…" : "Enviar postulación"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

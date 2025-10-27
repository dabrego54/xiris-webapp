"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

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
    submitted: { label: "Postulación enviada", tone: "text-amber-600 bg-amber-50" },
    under_review: { label: "Tu postulación está en revisión", tone: "text-blue-600 bg-blue-50" },
    approved: { label: "Postulación aprobada", tone: "text-emerald-600 bg-emerald-50" },
    rejected: { label: "Postulación rechazada", tone: "text-rose-600 bg-rose-50" },
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
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="mx-auto w-full max-w-3xl px-4">
        <header className="space-y-4">
          <h1 className="text-3xl font-semibold text-slate-900">Postulación a Técnico</h1>
          <p className="text-slate-600">
            Completa tus datos y adjunta los documentos requeridos para que nuestro equipo pueda revisar tu
            postulación.
          </p>
          {application && (
            <div className={`inline-flex items-center gap-2 rounded-full px-4 py-1 text-sm font-medium ${
              statusLabel[status]?.tone ?? "text-slate-600 bg-slate-100"
            }`}
            >
              <span className="h-2 w-2 rounded-full bg-current" aria-hidden />
              <span>{statusLabel[status]?.label ?? "Estado desconocido"}</span>
            </div>
          )}
        </header>

        <form onSubmit={handleSubmit} className="mt-10 space-y-8">
          <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <label htmlFor="fullName" className="text-sm font-medium text-slate-700">
                Nombre completo
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                disabled={!isEditable}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                placeholder="Ej. María López"
              />
            </div>

            <div>
              <label htmlFor="phone" className="text-sm font-medium text-slate-700">
                Teléfono de contacto
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                disabled={!isEditable}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                placeholder="Ej. +56 9 1234 5678"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Habilidades</label>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700"
                  >
                    {skill}
                    {isEditable && (
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
                        className="text-slate-500 transition hover:text-slate-700"
                        aria-label={`Eliminar habilidad ${skill}`}
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
                {isEditable && (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={skillInput}
                      onChange={(event) => setSkillInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault()
                          addSkill()
                        }
                      }}
                      className="w-48 rounded-lg border border-slate-200 px-3 py-1 text-sm text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                      placeholder="Añadir habilidad"
                    />
                    <button
                      type="button"
                      onClick={addSkill}
                      className="rounded-lg bg-slate-900 px-3 py-1 text-sm font-medium text-white shadow-sm transition hover:bg-slate-700"
                    >
                      Agregar
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="experience" className="text-sm font-medium text-slate-700">
                Experiencia
              </label>
              <textarea
                id="experience"
                value={experience}
                onChange={(event) => setExperience(event.target.value)}
                disabled={!isEditable}
                rows={5}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-slate-900 shadow-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                placeholder="Cuéntanos sobre tu experiencia laboral como técnico."
              />
            </div>
          </section>

          <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <label className="text-sm font-medium text-slate-700">Currículum (PDF)</label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(event) => setCvFile(event.target.files?.[0] ?? null)}
                disabled={!isEditable}
                className="mt-2 block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white file:transition file:hover:bg-slate-700 disabled:cursor-not-allowed"
              />
              {signedUrls.cvUrl && (
                <a
                  href={signedUrls.cvUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  Ver CV cargado
                </a>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">Certificaciones (PDF, PNG o JPG)</label>
              <input
                type="file"
                accept="application/pdf,image/png,image/jpeg"
                multiple
                onChange={(event) => setCertFiles(Array.from(event.target.files ?? []))}
                disabled={!isEditable}
                className="mt-2 block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white file:transition file:hover:bg-slate-700 disabled:cursor-not-allowed"
              />
              {signedUrls.certUrls.length > 0 && (
                <ul className="mt-3 space-y-2 text-sm text-slate-600">
                  {signedUrls.certUrls.map((cert) => (
                    <li key={cert.url}>
                      <a
                        href={cert.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-slate-600 hover:text-slate-900"
                      >
                        {cert.name}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <div className="flex items-center justify-end gap-3">
            {!isEditable && (
              <p className="text-sm text-slate-500">No puedes editar la postulación mientras esté en este estado.</p>
            )}
            <button
              type="submit"
              disabled={!isEditable || isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSubmitting ? "Enviando…" : "Enviar postulación"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

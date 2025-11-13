import Link from "next/link"
import { notFound } from "next/navigation"

import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import type { TechnicianApplication } from "@/types/database.types"

import { ApplicationReviewActions } from "./ApplicationReviewActions"
import { APPLICATION_STATUS_INFO } from "../status"

interface AdminTechnicianDetailPageProps {
  params: { id: string }
}

function formatDate(value: string | null): string {
  if (!value) {
    return "—"
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat("es-ES", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

export default async function AdminTechnicianDetailPage({
  params,
}: AdminTechnicianDetailPageProps) {
  const supabase = await createClient()
  const { id } = params

  const { data, error } = await supabase
    .from("technician_applications")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (error) {
    console.error("Error al cargar la postulación del técnico.", error)
    throw new Error("No pudimos cargar la postulación solicitada.")
  }

  if (!data) {
    notFound()
  }

  const application = data as TechnicianApplication
  const storage = supabase.storage.from("tech-docs")

  let cvSignedUrl: string | null = null
  if (application.cv_url) {
    const { data: cvData, error: cvError } = await storage.createSignedUrl(
      application.cv_url,
      60 * 60
    )
    if (cvError) {
      console.error("No se pudo generar la URL firmada del CV.", cvError)
    } else {
      cvSignedUrl = cvData?.signedUrl ?? null
    }
  }

  let certificationLinks: { name: string; url: string }[] = []
  if (application.certs_urls?.length) {
    const results = await Promise.all(
      application.certs_urls.map(async (path, index) => {
        const { data: certData, error: certError } = await storage.createSignedUrl(
          path,
          60 * 60
        )

        if (certError) {
          console.error("No se pudo generar la URL firmada de una certificación.", certError)
          return null
        }

        const url = certData?.signedUrl
        if (!url) {
          return null
        }

        return {
          name: `Certificación ${index + 1}`,
          url,
        }
      })
    )

    certificationLinks = results.filter((value): value is { name: string; url: string } => value !== null)
  }

  const statusInfo = APPLICATION_STATUS_INFO[application.status]
  const createdAtLabel = formatDate(application.created_at)
  const updatedAtLabel = formatDate(application.updated_at)
  const reviewedAtLabel = formatDate(application.reviewed_at)

  return (
    <div className="space-y-10">
      <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button asChild variant="ghost" className="h-9 rounded-full px-4 text-sm text-slate-600 hover:text-slate-900">
              <Link href="/admin/technicians">← Volver al panel</Link>
            </Button>
            <span className="font-mono text-xs text-slate-400">ID: {application.id}</span>
          </div>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8B5CF6]">
                Solicitud de técnico
              </p>
              <h1 className="text-3xl font-semibold text-slate-900">
                {application.full_name ?? application.email}
              </h1>
              <p className="text-sm text-slate-600">{application.email}</p>
            </div>
            <div className="flex flex-col gap-2 rounded-3xl border border-[#8B5CF6]/30 bg-gradient-to-br from-[#8B5CF6]/15 via-[#6366F1]/10 to-white px-6 py-5 shadow-inner">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#5B21B6]">Estado actual</span>
              <span className={`w-fit rounded-full px-4 py-1 text-sm font-semibold ${statusInfo.badgeClass}`}>
                {statusInfo.label}
              </span>
              <span className="text-xs text-slate-600">Última actualización {updatedAtLabel}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Datos del solicitante</h2>
              <p className="mt-1 text-sm text-slate-600">
                Información principal compartida en el formulario de postulación.
              </p>
            </div>
            <dl className="grid gap-6 md:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nombre</dt>
                <dd className="mt-1 text-sm text-slate-700">
                  {application.full_name ?? "Sin nombre"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</dt>
                <dd className="mt-1 text-sm text-slate-700">{application.email}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Teléfono</dt>
                <dd className="mt-1 text-sm text-slate-700">
                  {application.phone ?? "Sin teléfono"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Habilidades</dt>
                <dd className="mt-1 text-sm text-slate-700">
                  {application.skills?.length ? application.skills.join(", ") : "Sin especificar"}
                </dd>
              </div>
              <div className="md:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Experiencia</dt>
                <dd className="mt-1 whitespace-pre-line text-sm text-slate-700">
                  {application.experience ?? "Sin descripción"}
                </dd>
              </div>
            </dl>
          </section>

          <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Documentos adjuntos</h2>
              <p className="mt-1 text-sm text-slate-600">
                Accede a los archivos entregados por el postulante para validar su experiencia.
              </p>
            </div>
            <div className="space-y-5 text-sm text-slate-700">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                <p className="text-sm font-semibold text-slate-900">Currículum</p>
                {cvSignedUrl ? (
                  <a
                    href={cvSignedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center text-sm font-medium text-[#7C3AED] hover:underline"
                  >
                    Descargar CV
                  </a>
                ) : (
                  <p className="mt-2 text-sm text-slate-600">No se adjuntó CV.</p>
                )}
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                <p className="text-sm font-semibold text-slate-900">Certificaciones</p>
                {certificationLinks.length > 0 ? (
                  <ul className="mt-2 space-y-2 text-sm">
                    {certificationLinks.map((cert) => (
                      <li key={cert.name}>
                        <a
                          href={cert.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#7C3AED] hover:underline"
                        >
                          {cert.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-slate-600">No se adjuntaron certificaciones.</p>
                )}
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-slate-900">Acciones de revisión</h2>
              <p className="text-sm text-slate-600">
                Actualiza el estado, registra notas y finaliza el proceso de revisión.
              </p>
            </div>
            <ApplicationReviewActions
              applicationId={application.id}
              status={application.status}
              existingReviewNotes={application.review_notes}
            />
          </section>

          <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Historial de revisión</h2>
            <dl className="space-y-4 text-sm text-slate-700">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Notas del revisor</dt>
                <dd className="mt-1 whitespace-pre-line">
                  {application.review_notes ?? "Sin notas"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fecha de revisión</dt>
                <dd className="mt-1">{reviewedAtLabel}</dd>
              </div>
            </dl>
          </section>

          <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Metadatos</h2>
            <dl className="space-y-4 text-sm text-slate-700">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Creada</dt>
                <dd className="font-medium text-slate-900">{createdAtLabel}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Actualizada</dt>
                <dd className="font-medium text-slate-900">{updatedAtLabel}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Revisor asignado</dt>
                <dd className="mt-1 font-medium text-slate-900">
                  {application.reviewer_id ?? "Sin asignar"}
                </dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
    </div>
  )
}

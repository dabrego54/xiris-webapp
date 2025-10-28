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

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/technicians">Volver a la lista</Link>
        </Button>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              {application.full_name ?? application.email}
            </h1>
            <div className="mt-2 inline-flex items-center gap-2 text-sm text-slate-600">
              <span>Estado actual:</span>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusInfo.badgeClass}`}
              >
                {statusInfo.label}
              </span>
            </div>
          </div>
          <ApplicationReviewActions
            applicationId={application.id}
            status={application.status}
            existingReviewNotes={application.review_notes}
          />
        </div>
      </div>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Datos del solicitante</h2>
        <dl className="grid gap-4 md:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Nombre</dt>
            <dd className="text-sm text-slate-700">
              {application.full_name ?? "Sin nombre"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</dt>
            <dd className="text-sm text-slate-700">{application.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Teléfono</dt>
            <dd className="text-sm text-slate-700">
              {application.phone ?? "Sin teléfono"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Habilidades</dt>
            <dd className="text-sm text-slate-700">
              {application.skills?.length ? application.skills.join(", ") : "Sin especificar"}
            </dd>
          </div>
          <div className="md:col-span-2">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Experiencia</dt>
            <dd className="text-sm text-slate-700 whitespace-pre-line">
              {application.experience ?? "Sin descripción"}
            </dd>
          </div>
        </dl>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Documentos</h2>
        <div className="space-y-3 text-sm text-slate-700">
          {cvSignedUrl ? (
            <div>
              <p className="font-medium text-slate-900">Currículum</p>
              <a
                href={cvSignedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#8B5CF6] hover:underline"
              >
                Descargar CV
              </a>
            </div>
          ) : (
            <p>No se adjuntó CV.</p>
          )}

          {certificationLinks.length > 0 ? (
            <div className="space-y-2">
              <p className="font-medium text-slate-900">Certificaciones</p>
              <ul className="list-disc space-y-1 pl-5">
                {certificationLinks.map((cert) => (
                  <li key={cert.name}>
                    <a
                      href={cert.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#8B5CF6] hover:underline"
                    >
                      {cert.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p>No se adjuntaron certificaciones.</p>
          )}
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Historial de revisión</h2>
        <dl className="grid gap-4 md:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Notas del revisor
            </dt>
            <dd className="whitespace-pre-line text-sm text-slate-700">
              {application.review_notes ?? "Sin notas"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Fecha de revisión
            </dt>
            <dd className="text-sm text-slate-700">{formatDate(application.reviewed_at)}</dd>
          </div>
        </dl>
      </section>

      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Metadatos</h2>
        <dl className="grid gap-4 md:grid-cols-3">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Creada</dt>
            <dd className="text-sm text-slate-700">{formatDate(application.created_at)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Actualizada</dt>
            <dd className="text-sm text-slate-700">{formatDate(application.updated_at)}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Revisor asignado</dt>
            <dd className="text-sm text-slate-700">
              {application.reviewer_id ?? "Sin asignar"}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  )
}

import Link from "next/link"
import { notFound } from "next/navigation"

import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import type { ApplicationStatus } from "@/types/database.types"

import ApplicationActions from "./ApplicationActions"

type DocumentLink = {
  label: string
  url: string
}

type Reviewer = {
  full_name: string | null
}

function formatDate(value: string | null): string {
  if (!value) return "-"
  const date = new Date(value)
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date)
}

function buildStatusBadge(status: ApplicationStatus): { label: string; className: string } {
  switch (status) {
    case "submitted":
      return { label: "Recibida", className: "bg-slate-100 text-slate-700" }
    case "under_review":
      return { label: "En revisión", className: "bg-amber-100 text-amber-700" }
    case "approved":
      return { label: "Aprobada", className: "bg-emerald-100 text-emerald-700" }
    case "rejected":
      return { label: "Rechazada", className: "bg-rose-100 text-rose-700" }
    default:
      return { label: status, className: "bg-slate-100 text-slate-700" }
  }
}

export default async function TechnicianApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string }
}) {
  const supabase = await createClient()

  const resolvedParams = ((await params) ?? { id: "" }) as { id: string }

  if (!resolvedParams?.id) {
    notFound()
  }

  const { data: application, error } = await supabase
    .from("technician_applications")
    .select("*")
    .eq("id", resolvedParams.id)
    .maybeSingle()

  if (error) {
    console.error("Error fetching technician application", error)
  }

  if (!application) {
    notFound()
  }

  let reviewer: Reviewer | null = null

  if (application.reviewer_id) {
    const { data: reviewerData, error: reviewerError } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", application.reviewer_id)
      .maybeSingle()

    if (reviewerError) {
      console.error("Error fetching reviewer profile", reviewerError)
    } else if (reviewerData) {
      reviewer = reviewerData as Reviewer
    }
  }

  const storage = supabase.storage.from("tech-docs")

  let cvLink: DocumentLink | null = null
  if (application.cv_url) {
    const { data: cvUrl, error: cvError } = await storage.createSignedUrl(
      application.cv_url,
      60 * 60,
    )

    if (cvError) {
      console.error("Error creating CV signed URL", cvError)
    } else if (cvUrl?.signedUrl) {
      cvLink = { label: "Currículum", url: cvUrl.signedUrl }
    }
  }

  const certificateLinks: DocumentLink[] = []
  if (application.certs_urls?.length) {
    const certs = await Promise.all(
      application.certs_urls.map(async (path, index) => {
        const { data, error: certError } = await storage.createSignedUrl(
          path,
          60 * 60,
        )

        if (certError) {
          console.error("Error creating certificate signed URL", certError)
          return null
        }

        if (!data?.signedUrl) {
          return null
        }

        return {
          label: `Certificación ${index + 1}`,
          url: data.signedUrl,
        }
      }),
    )

    certs.forEach((cert) => {
      if (cert) {
        certificateLinks.push(cert)
      }
    })
  }

  const status = application.status as ApplicationStatus
  const statusBadge = buildStatusBadge(status)

  return (
    <div className="space-y-6">
      <Button variant="ghost" asChild size="sm">
        <Link href="/admin/technicians">← Volver a la lista</Link>
      </Button>

      <div className="space-y-8 rounded-3xl bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-slate-900">
              {application.full_name ?? "Sin nombre"}
            </h2>
            <p className="text-sm text-slate-500">
              Postulación enviada el {formatDate(application.created_at)}
            </p>
            <p className="text-sm text-slate-500">Actualizada el {formatDate(application.updated_at)}</p>
          </div>
          <div className="flex flex-col items-start gap-3 md:items-end">
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusBadge.className}`}
            >
              {statusBadge.label}
            </span>
            <ApplicationActions applicationId={application.id} status={status} />
          </div>
        </div>

        <section className="grid gap-6 rounded-2xl border border-slate-100 p-6 md:grid-cols-2">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Información de contacto
            </h3>
            <div className="space-y-2 text-sm text-slate-700">
              <p>
                <span className="font-medium text-slate-900">Email:</span> {application.email}
              </p>
              <p>
                <span className="font-medium text-slate-900">Teléfono:</span>{" "}
                {application.phone ?? "No informado"}
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Revisión
            </h3>
            <div className="space-y-2 text-sm text-slate-700">
              <p>
                <span className="font-medium text-slate-900">Revisor asignado:</span>{" "}
                {reviewer
                  ? reviewer.full_name || application.reviewer_id
                  : "Sin asignar"}
              </p>
              <p>
                <span className="font-medium text-slate-900">Última decisión:</span>{" "}
                {application.reviewed_at ? formatDate(application.reviewed_at) : "Pendiente"}
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4 rounded-2xl border border-slate-100 p-6">
            <h3 className="text-base font-semibold text-slate-900">Experiencia</h3>
            <p className="text-sm text-slate-700">
              {application.experience?.length ? application.experience : "No se entregó experiencia"}
            </p>
          </div>
          <div className="space-y-4 rounded-2xl border border-slate-100 p-6">
            <h3 className="text-base font-semibold text-slate-900">Habilidades declaradas</h3>
            {application.skills?.length ? (
              <ul className="flex flex-wrap gap-2 text-sm text-slate-700">
                {application.skills.map((skill) => (
                  <li
                    key={skill}
                    className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700"
                  >
                    {skill}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-700">No se ingresaron habilidades.</p>
            )}
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-100 p-6">
          <h3 className="text-base font-semibold text-slate-900">Documentos adjuntos</h3>
          <div className="space-y-3 text-sm text-slate-700">
            {cvLink ? (
              <p>
                <span className="font-medium text-slate-900">Currículum:</span>{" "}
                <a
                  href={cvLink.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#7C3AED] hover:underline"
                >
                  Descargar
                </a>
              </p>
            ) : (
              <p>No se cargó un CV.</p>
            )}
            {certificateLinks.length ? (
              <ul className="space-y-2">
                {certificateLinks.map((cert) => (
                  <li key={cert.url}>
                    <a
                      href={cert.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#7C3AED] hover:underline"
                    >
                      {cert.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No se adjuntaron certificaciones.</p>
            )}
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-slate-100 p-6">
          <h3 className="text-base font-semibold text-slate-900">Notas de revisión</h3>
          <p className="text-sm text-slate-700">
            {application.review_notes?.length ? application.review_notes : "Sin notas registradas."}
          </p>
        </section>
      </div>
    </div>
  )
}

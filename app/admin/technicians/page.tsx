import Link from "next/link"

import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/server"
import type { ApplicationStatus } from "@/types/database.types"

const PAGE_SIZE = 10
const STATUSES: ApplicationStatus[] = [
  "submitted",
  "under_review",
  "approved",
  "rejected",
]

type SearchParams = {
  status?: string | string[]
  query?: string | string[]
  page?: string | string[]
}

function isApplicationStatus(value: string | undefined): value is ApplicationStatus {
  return !!value && STATUSES.includes(value as ApplicationStatus)
}

function escapeLikePattern(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/,/g, "\\,")
}

function formatDate(value: string | null): string {
  if (!value) return "-"
  const date = new Date(value)
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
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

export default async function AdminTechniciansPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams> | SearchParams
}) {
  const supabase = await createClient()

  const resolvedSearchParams = ((await searchParams) ?? {}) as SearchParams

  const statusParam = Array.isArray(resolvedSearchParams.status)
    ? resolvedSearchParams.status[0]
    : resolvedSearchParams.status
  const queryParam = Array.isArray(resolvedSearchParams.query)
    ? resolvedSearchParams.query[0]
    : resolvedSearchParams.query
  const pageParam = Array.isArray(resolvedSearchParams.page)
    ? resolvedSearchParams.page[0]
    : resolvedSearchParams.page

  const activeStatus = isApplicationStatus(statusParam) ? statusParam : undefined
  const query = typeof queryParam === "string" ? queryParam.trim() : ""
  const currentPage = Math.max(parseInt(pageParam ?? "1", 10) || 1, 1)
  const from = (currentPage - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let builder = supabase
    .from("technician_applications")
    .select("id, full_name, email, status, created_at, updated_at", { count: "exact" })

  if (activeStatus) {
    builder = builder.eq("status", activeStatus)
  }

  if (query) {
    const escaped = escapeLikePattern(query)
    builder = builder.or(
      `email.ilike.%${escaped}%,full_name.ilike.%${escaped}%`,
    )
  }

  const { data: applications, error, count } = await builder
    .order("created_at", { ascending: false })
    .range(from, to)

  if (error) {
    console.error("Error fetching technician applications", error)
    throw new Error("No se pudieron obtener las postulaciones")
  }

  const total = count ?? 0
  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1)

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              Postulaciones de Técnicos
            </h2>
            <p className="text-sm text-slate-500">
              Filtra, busca y gestiona las postulaciones recibidas.
            </p>
          </div>
          <form className="flex flex-col gap-3 sm:flex-row sm:items-center" action="">
            <input type="hidden" name="page" value="1" />
            <label className="flex flex-col text-sm font-medium text-slate-600">
              Estado
              <select
                name="status"
                defaultValue={activeStatus ?? ""}
                className="mt-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 focus:border-[#7C3AED] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/50"
              >
                <option value="">Todos</option>
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {buildStatusBadge(status).label}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-center gap-2">
              <label className="sr-only" htmlFor="query">
                Buscar
              </label>
              <input
                id="query"
                name="query"
                type="search"
                placeholder="Buscar por nombre o email"
                defaultValue={query}
                className="w-full rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-[#7C3AED] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/50"
              />
              <Button type="submit" className="whitespace-nowrap">
                Aplicar filtros
              </Button>
            </div>
          </form>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-left">
          <thead className="bg-slate-50">
            <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th scope="col" className="px-6 py-4">
                Nombre
              </th>
              <th scope="col" className="px-6 py-4">
                Email
              </th>
              <th scope="col" className="px-6 py-4">
                Estado
              </th>
              <th scope="col" className="px-6 py-4">
                Creada
              </th>
              <th scope="col" className="px-6 py-4">
                Actualizada
              </th>
              <th scope="col" className="px-6 py-4 text-right">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
            {applications?.length ? (
              applications.map((application) => {
                const badge = buildStatusBadge(application.status as ApplicationStatus)
                return (
                  <tr key={application.id} className="transition hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {application.full_name ?? "Sin nombre"}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{application.email}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {formatDate(application.created_at)}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {formatDate(application.updated_at)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/technicians/${application.id}`}>
                          Ver detalle
                        </Link>
                      </Button>
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                  No se encontraron postulaciones con los filtros seleccionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col items-center justify-between gap-4 rounded-3xl bg-white p-4 shadow-sm sm:flex-row">
        <p className="text-sm text-slate-600">
          Mostrando {applications?.length ?? 0} de {total} postulaciones
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage <= 1}
            asChild
          >
            <Link
              href={{
                pathname: "/admin/technicians",
                query: {
                  ...(activeStatus ? { status: activeStatus } : {}),
                  ...(query ? { query } : {}),
                  page: currentPage - 1,
                },
              }}
            >
              Anterior
            </Link>
          </Button>
          <span className="text-sm font-medium text-slate-700">
            Página {currentPage} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage >= totalPages}
            asChild
          >
            <Link
              href={{
                pathname: "/admin/technicians",
                query: {
                  ...(activeStatus ? { status: activeStatus } : {}),
                  ...(query ? { query } : {}),
                  page: currentPage + 1,
                },
              }}
            >
              Siguiente
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

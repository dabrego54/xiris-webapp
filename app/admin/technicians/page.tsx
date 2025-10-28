import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/server"
import type { ApplicationStatus, TechnicianApplication } from "@/types/database.types"

import { APPLICATION_STATUS_INFO } from "./status"

const PAGE_SIZE = 10

interface AdminTechniciansPageProps {
  searchParams: {
    status?: string
    query?: string
    page?: string
  }
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

function buildQueryString(
  currentParams: URLSearchParams,
  overrides: Record<string, string | number | null | undefined>
): string {
  const params = new URLSearchParams(currentParams.toString())

  Object.entries(overrides).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      params.delete(key)
      return
    }

    params.set(key, String(value))
  })

  const queryString = params.toString()
  return queryString.length > 0
    ? `/admin/technicians?${queryString}`
    : "/admin/technicians"
}

export default async function AdminTechniciansPage({
  searchParams,
}: AdminTechniciansPageProps) {
  const supabase = await createClient()
  const statusParam = searchParams.status ?? ""
  const selectedStatus = (Object.keys(APPLICATION_STATUS_INFO) as ApplicationStatus[]).includes(
    statusParam as ApplicationStatus
  )
    ? (statusParam as ApplicationStatus)
    : undefined
  const query = searchParams.query?.trim() ?? ""
  const page = Math.max(parseInt(searchParams.page ?? "1", 10) || 1, 1)

  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let request = supabase
    .from("technician_applications")
    .select("*", { count: "exact" })

  if (selectedStatus) {
    request = request.eq("status", selectedStatus)
  }

  if (query) {
    const likeQuery = `%${query}%`
    request = request.or(
      `email.ilike.${likeQuery},full_name.ilike.${likeQuery}`
    )
  }

  const { data, count, error } = await request
    .order("created_at", { ascending: false })
    .range(from, to)

  if (error) {
    console.error("Error al cargar las postulaciones de técnicos.", error)
    throw new Error("No pudimos cargar las postulaciones de técnicos.")
  }

  const applications = (data ?? []) as TechnicianApplication[]
  const totalPages = count ? Math.max(Math.ceil(count / PAGE_SIZE), 1) : 1
  const currentSearchParams = new URLSearchParams()
  if (selectedStatus) {
    currentSearchParams.set("status", selectedStatus)
  }
  if (query) {
    currentSearchParams.set("query", query)
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-slate-900">Postulaciones de técnicos</h1>
        <p className="text-sm text-slate-600">
          Revisa y gestiona las postulaciones enviadas por los técnicos.
        </p>
      </div>

      <form className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-end">
        <div className="flex-1 space-y-2">
          <label className="block text-sm font-medium text-slate-700" htmlFor="query">
            Buscar
          </label>
          <Input
            id="query"
            name="query"
            placeholder="Buscar por nombre o email"
            defaultValue={query}
          />
        </div>
        <div className="w-full space-y-2 md:w-56">
          <label className="block text-sm font-medium text-slate-700" htmlFor="status">
            Estado
          </label>
          <select
            id="status"
            name="status"
            defaultValue={selectedStatus ?? ""}
            className="h-11 w-full rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6]/60"
          >
            <option value="">Todos</option>
            {Object.entries(APPLICATION_STATUS_INFO).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex w-full gap-3 md:w-auto">
          <Button type="submit" className="w-full md:w-auto">
            Aplicar filtros
          </Button>
          {(selectedStatus || query) && (
            <Button asChild type="button" variant="outline" className="w-full md:w-auto">
              <Link href="/admin/technicians">Limpiar</Link>
            </Button>
          )}
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Nombre
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Estado
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Creada
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Actualizada
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {applications.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500">
                  No encontramos postulaciones que coincidan con la búsqueda.
                </td>
              </tr>
            ) : (
              applications.map((application) => {
                const statusInfo = APPLICATION_STATUS_INFO[application.status]
                return (
                  <tr key={application.id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                      {application.full_name ?? "Sin nombre"}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{application.email}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusInfo.badgeClass}`}
                      >
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{formatDate(application.created_at)}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{formatDate(application.updated_at)}</td>
                    <td className="px-6 py-4 text-right text-sm font-semibold">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/technicians/${application.id}`}>Ver</Link>
                      </Button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {applications.length > 0 && totalPages > 1 && (
        <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 md:flex-row">
          <p>
            Página {page} de {totalPages}
          </p>
          <div className="flex items-center gap-3">
            <Button
              asChild
              variant="outline"
              size="sm"
              disabled={page === 1}
            >
              <Link
                href={buildQueryString(currentSearchParams, {
                  page: page - 1,
                })}
              >
                Anterior
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              disabled={page === totalPages}
            >
              <Link
                href={buildQueryString(currentSearchParams, {
                  page: page + 1,
                })}
              >
                Siguiente
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

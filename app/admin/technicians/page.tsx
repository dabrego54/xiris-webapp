import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  const totalResults = count ?? applications.length
  const rangeStart = applications.length === 0 ? 0 : from + 1
  const rangeEnd = applications.length === 0 ? 0 : from + applications.length
  const currentSearchParams = new URLSearchParams()
  if (selectedStatus) {
    currentSearchParams.set("status", selectedStatus)
  }
  if (query) {
    currentSearchParams.set("query", query)
  }

  return (
    <div className="space-y-10">
      <section className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-sm">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="max-w-xl space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#8B5CF6]">
              Panel de revisión
            </p>
            <h1 className="text-3xl font-semibold text-slate-900">
              Postulaciones de técnicos
            </h1>
            <p className="text-sm text-slate-600">
              Revisa, filtra y gestiona cada solicitud para avanzar en el proceso de onboarding de técnicos.
            </p>
          </div>
          <div className="rounded-3xl border border-[#8B5CF6]/30 bg-gradient-to-br from-[#8B5CF6]/15 via-[#6366F1]/10 to-white px-6 py-5 text-left shadow-inner">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#5B21B6]">Postulaciones totales</p>
            <p className="mt-2 text-4xl font-semibold text-slate-900">{totalResults}</p>
            <p className="mt-1 text-xs text-slate-600">Registros encontrados con los filtros actuales</p>
          </div>
        </div>
      </section>

      <form className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_auto] md:items-end">
          <div className="space-y-2">
            <Label htmlFor="query">Buscar</Label>
            <Input
              id="query"
              name="query"
              placeholder="Buscar por nombre o email"
              defaultValue={query}
              className="h-11 rounded-2xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Estado</Label>
            <select
              id="status"
              name="status"
              defaultValue={selectedStatus ?? ""}
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6]/60"
            >
              <option value="">Todos</option>
              {Object.entries(APPLICATION_STATUS_INFO).map(([value, { label }]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:justify-end">
            <Button type="submit" className="h-11 rounded-2xl px-6">
              Aplicar filtros
            </Button>
            {(selectedStatus || query) && (
              <Button asChild type="button" variant="outline" className="h-11 rounded-2xl px-6">
                <Link href="/admin/technicians">Limpiar</Link>
              </Button>
            )}
          </div>
        </div>
      </form>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
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
                  <tr key={application.id} className="transition-colors hover:bg-slate-50/70">
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">
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
                      <Button asChild size="sm" variant="secondary" className="rounded-full">
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

      {applications.length > 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 text-sm text-slate-600 md:flex-row md:items-center md:justify-between">
            <p>
              Mostrando <span className="font-semibold text-slate-900">{rangeStart}</span> a{" "}
              <span className="font-semibold text-slate-900">{rangeEnd}</span> de{" "}
              <span className="font-semibold text-slate-900">{totalResults}</span> postulaciones
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-3">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  className="rounded-full"
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
                  className="rounded-full"
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
            )}
          </div>
        </div>
      )}
    </div>
  )
}

import Link from 'next/link';
import type { Metadata } from 'next';

import { FiltersForm } from './filters-form';
import type { TechnicianStatusFilter } from './types';
import { createClient } from '@/lib/supabase/server';
import type { TechnicianApplication } from '@/types/database.types';

const PAGE_SIZE = 10;

const STATUS_OPTIONS: { value: TechnicianStatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'submitted', label: 'Enviada' },
  { value: 'under_review', label: 'En revisión' },
  { value: 'approved', label: 'Aprobada' },
  { value: 'rejected', label: 'Rechazada' },
];

type PageSearchParams = {
  status?: TechnicianStatusFilter;
  search?: string;
  page?: string;
};

export const metadata: Metadata = {
  title: 'Panel de técnicos',
};

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleString('es-CL', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function buildPageLink(baseParams: URLSearchParams, page: number) {
  const params = new URLSearchParams(baseParams);
  if (page > 1) {
    params.set('page', String(page));
  } else {
    params.delete('page');
  }
  const query = params.toString();
  return query ? `/admin/technicians?${query}` : '/admin/technicians';
}

async function fetchApplications({
  status,
  search,
  page,
}: {
  status: TechnicianStatusFilter;
  search: string;
  page: number;
}): Promise<{ applications: TechnicianApplication[]; count: number }> {
  const supabase = await createClient();
  const offset = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from('technician_applications')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  if (search) {
    const likeValue = `%${search}%`;
    query = query.or(`email.ilike.${likeValue},full_name.ilike.${likeValue}`);
  }

  const { data, error, count } = await query.range(offset, offset + PAGE_SIZE - 1);

  if (error) {
    console.error('Error fetching technician applications', error);
    throw new Error('No se pudieron cargar las postulaciones');
  }

  return {
    applications: data ?? [],
    count: count ?? 0,
  };
}

export default async function AdminTechniciansPage({
  searchParams = {},
}: {
  searchParams?: PageSearchParams;
}) {
  const status = (searchParams.status ?? 'all') as TechnicianStatusFilter;
  const search = searchParams.search?.toString() ?? '';
  const page = Math.max(1, Number(searchParams.page ?? '1') || 1);

  const { applications, count } = await fetchApplications({ status, search, page });
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const baseParams = new URLSearchParams();

  if (status && status !== 'all') {
    baseParams.set('status', status);
  }
  if (search) {
    baseParams.set('search', search);
  }

  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  return (
    <div className="mx-auto mt-10 max-w-5xl px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-gray-900">Postulaciones de técnicos</h1>
        <p className="text-sm text-gray-600">
          Gestiona las solicitudes enviadas por los técnicos para unirse a la plataforma.
        </p>
      </div>

      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <FiltersForm
          initialSearch={search}
          initialStatus={status}
          statusOptions={STATUS_OPTIONS}
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 text-left text-sm font-semibold text-gray-600">
            <tr>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Creada</th>
              <th className="px-4 py-3">Actualizada</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 text-sm text-gray-700">
            {applications.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                  No se encontraron postulaciones con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              applications.map((application) => (
                <tr key={application.id}>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {application.full_name ?? 'Sin nombre'}
                  </td>
                  <td className="px-4 py-3">{application.email}</td>
                  <td className="px-4 py-3 capitalize">
                    {application.status.replace('_', ' ')}
                  </td>
                  <td className="px-4 py-3">{formatDate(application.created_at)}</td>
                  <td className="px-4 py-3">{formatDate(application.updated_at)}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/technicians/${application.id}`}
                      className="inline-flex items-center rounded-md border border-gray-300 px-3 py-1 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
                    >
                      Ver
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
        <span>
          Página {page} de {totalPages}
        </span>
        <div className="space-x-2">
          <Link
            aria-disabled={prevDisabled}
            className={`inline-flex items-center rounded-md border px-3 py-1 font-medium ${
              prevDisabled
                ? 'cursor-not-allowed border-gray-200 text-gray-400'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
            href={prevDisabled ? '#' : buildPageLink(baseParams, page - 1)}
          >
            Anterior
          </Link>
          <Link
            aria-disabled={nextDisabled}
            className={`inline-flex items-center rounded-md border px-3 py-1 font-medium ${
              nextDisabled
                ? 'cursor-not-allowed border-gray-200 text-gray-400'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
            href={nextDisabled ? '#' : buildPageLink(baseParams, page + 1)}
          >
            Siguiente
          </Link>
        </div>
      </div>
    </div>
  );
}

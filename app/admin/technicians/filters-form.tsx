'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';

import type { TechnicianStatusFilter } from './types';

type FiltersFormProps = {
  initialStatus: TechnicianStatusFilter;
  initialSearch: string;
  statusOptions: { value: TechnicianStatusFilter; label: string }[];
};

export function FiltersForm({ initialStatus, initialSearch, statusOptions }: FiltersFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<TechnicianStatusFilter>(initialStatus);
  const [search, setSearch] = useState(initialSearch);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = new URLSearchParams(searchParams?.toString());

    if (status && status !== 'all') {
      params.set('status', status);
    } else {
      params.delete('status');
    }

    const trimmedSearch = search.trim();
    if (trimmedSearch) {
      params.set('search', trimmedSearch);
    } else {
      params.delete('search');
    }

    params.set('page', '1');

    const query = params.toString();
    startTransition(() => {
      router.push(query ? `/admin/technicians?${query}` : '/admin/technicians');
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 md:flex-row md:items-end"
      role="search"
    >
      <div className="w-full md:w-48">
        <label htmlFor="status" className="mb-1 block text-sm font-medium text-gray-700">
          Status
        </label>
        <select
          id="status"
          name="status"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          value={status}
          onChange={(event) => setStatus(event.target.value as TechnicianStatusFilter)}
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex-1">
        <label htmlFor="search" className="mb-1 block text-sm font-medium text-gray-700">
          Buscar por email o nombre
        </label>
        <input
          id="search"
          name="search"
          type="text"
          placeholder="ej: juan@correo.com"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
        disabled={isPending}
      >
        {isPending ? 'Aplicando…' : 'Aplicar filtros'}
      </button>
    </form>
  );
}

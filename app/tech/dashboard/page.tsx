import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { AvailabilityToggle } from './availability-toggle';
import type { TechnicianPresenceStatus } from '@/types/database.types';
import {
  ArrowUpRight,
  BadgeCheck,
  CalendarClock,
  ClipboardList,
  CreditCard,
  MapPin,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Dashboard del técnico',
};

const checklistItems = [
  {
    title: 'Datos bancarios',
    description: 'Agrega la información para recibir tus pagos.',
    href: '/tech/tasks/banking',
    icon: CreditCard,
  },
  {
    title: 'Disponibilidad',
    description: 'Configura tus horarios para tomar tickets.',
    href: '/tech/tasks/availability',
    icon: CalendarClock,
  },
  {
    title: 'Geolocalización',
    description: 'Activa la ubicación para priorizar tickets cercanos.',
    href: '/tech/tasks/location',
    icon: MapPin,
  },
];

const quickActions = [
  {
    title: 'Ver tickets disponibles',
    description: 'Consulta solicitudes activas y postula.',
    href: '/tech/tickets',
  },
  {
    title: 'Historial de tickets',
    description: 'Revisa servicios completados y calificaciones.',
    href: '/tech/history',
  },
  {
    title: 'Perfil técnico',
    description: 'Actualiza tus datos personales y de servicio.',
    href: '/tech/profile',
  },
];

export default async function TechDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=/tech/dashboard');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile) {
    redirect('/dashboard');
  }

  if (profile.role?.trim().toLowerCase() !== 'technician') {
    redirect('/dashboard');
  }

  const displayName = profile.full_name?.trim() || user.email || 'técnico';

  type TechnicianStatusRow = {
    is_online: boolean;
    current_status: TechnicianPresenceStatus;
  };

  const { data: statusRow } = await supabase
    .from('technician_status')
    .select('is_online, current_status')
    .eq('technician_id', user.id)
    .returns<TechnicianStatusRow>()
    .maybeSingle();

  const isOnline = statusRow?.is_online ?? false;
  const currentStatus = statusRow?.current_status ?? 'offline';
  const statusBadgeClass = isOnline
    ? 'bg-emerald-100 text-emerald-700'
    : 'bg-slate-200 text-slate-700';
  const statusBadgeLabel = isOnline ? 'Activo' : 'Offline';

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <header className="mb-8">
          <p className="text-3xl font-semibold text-slate-900">Hola, {displayName} 👋</p>
          <p className="mt-2 text-sm font-medium uppercase tracking-wide text-slate-500">
            Panel del Técnico
          </p>
        </header>

        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <BadgeCheck className="h-5 w-5 text-emerald-500" aria-hidden />
                  <h2 className="text-lg font-semibold text-slate-900">Estado del Técnico</h2>
                </div>
                <p className="mt-3 text-2xl font-semibold text-slate-900">Administra tu disponibilidad</p>
                <p className="mt-2 text-sm text-slate-600">
                  Comparte tu ubicación cuando estés disponible para recibir tickets y pasa a offline cuando necesites un descanso.
                </p>
              </div>
              <span className={`inline-flex items-center rounded-full px-4 py-1 text-sm font-medium ${statusBadgeClass}`}>
                {statusBadgeLabel}
              </span>
            </div>
            <div className="mt-6">
              <AvailabilityToggle initialStatus={currentStatus} />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Checklist inicial</h2>
                <p className="text-sm text-slate-600">Completa estos pasos para optimizar tu perfil.</p>
              </div>
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                3 ítems
              </span>
            </div>
            <ul className="mt-6 space-y-4">
              {checklistItems.map((item) => (
                <li
                  key={item.title}
                  className="flex flex-col gap-4 rounded-xl border border-slate-100 bg-slate-50/70 p-4 transition hover:border-indigo-200 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-white p-2 text-indigo-500 shadow-sm">
                      <item.icon className="h-5 w-5" aria-hidden />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{item.title}</p>
                      <p className="text-sm text-slate-600">{item.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700">
                      Pendiente
                    </span>
                    <Link
                      className="text-sm font-medium text-indigo-600 underline-offset-4 hover:text-indigo-700 hover:underline"
                      href={item.href}
                    >
                      Completar
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <ClipboardList className="h-5 w-5 text-indigo-500" aria-hidden />
              <h2 className="text-lg font-semibold text-slate-900">Accesos rápidos</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {quickActions.map((action) => (
                <Link
                  key={action.title}
                  href={action.href}
                  className="group flex flex-col rounded-xl border border-slate-100 bg-white/80 p-4 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-slate-900">{action.title}</p>
                    <ArrowUpRight className="h-4 w-4 text-slate-400 transition group-hover:text-indigo-500" aria-hidden />
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{action.description}</p>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

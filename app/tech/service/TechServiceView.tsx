'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Loader2, MapPin, RefreshCw, XCircle } from 'lucide-react';

import TechServiceMap from './TechServiceMap';

type ServiceStatus =
  | 'requested'
  | 'searching'
  | 'candidate_ready'
  | 'accepted'
  | 'on_route'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

type ServiceSnapshot = {
  serviceRequestId: string;
  status: ServiceStatus;
  problemDescription: string | null;
  clientLocation: {
    lat: number | null;
    lng: number | null;
  } | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string | null;
};

const ACTION_ENDPOINTS: Partial<Record<ServiceStatus, { label: string; endpoint: string }>> = {
  accepted: {
    label: 'Voy en camino',
    endpoint: '/api/tech/service/start-route',
  },
  on_route: {
    label: 'Iniciar trabajo',
    endpoint: '/api/tech/service/start-work',
  },
  in_progress: {
    label: 'Finalizar servicio',
    endpoint: '/api/tech/service/complete',
  },
};

const STATUS_LABELS: Record<ServiceStatus, string> = {
  requested: 'Solicitado',
  searching: 'Buscando técnico',
  candidate_ready: 'Candidato listo',
  accepted: 'Aceptado',
  on_route: 'En camino',
  in_progress: 'En progreso',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

const STATUS_BADGE_CLASS: Partial<Record<ServiceStatus, string>> = {
  accepted: 'bg-amber-100 text-amber-800',
  on_route: 'bg-sky-100 text-sky-700',
  in_progress: 'bg-indigo-100 text-indigo-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-rose-100 text-rose-700',
};

export type TechServiceViewProps = ServiceSnapshot;

export default function TechServiceView(initialData: TechServiceViewProps) {
  const router = useRouter();
  const [service, setService] = useState<ServiceSnapshot>(initialData);
  const [actionLoading, setActionLoading] = useState(false);
  const [locationUpdating, setLocationUpdating] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const actionConfig = ACTION_ENDPOINTS[service.status];

  const statusBadgeClass = STATUS_BADGE_CLASS[service.status] ?? 'bg-slate-200 text-slate-700';
  const statusLabel = STATUS_LABELS[service.status] ?? service.status;

  const formattedStartedAt = useMemo(() => formatDateTime(service.startedAt), [service.startedAt]);
  const formattedCompletedAt = useMemo(() => formatDateTime(service.completedAt), [service.completedAt]);
  const formattedCreatedAt = useMemo(() => formatDateTime(service.createdAt), [service.createdAt]);

  const refreshService = useCallback(async () => {
    try {
      const response = await fetch(`/api/tech/service/${service.serviceRequestId}`, {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('No se pudo actualizar la información del servicio.');
      }

      const payload = (await response.json()) as Partial<ServiceSnapshot>;
      setService((current) => ({
        ...current,
        ...payload,
        serviceRequestId: current.serviceRequestId,
        clientLocation: payload.clientLocation ?? current.clientLocation,
      }));
    } catch (error) {
      console.error(error);
      setErrorMessage('No se pudo refrescar el estado del servicio.');
    }
  }, [service.serviceRequestId]);

  useEffect(() => {
    const interval = setInterval(() => {
      refreshService();
    }, 15000);

    return () => clearInterval(interval);
  }, [refreshService]);

  const handleAction = useCallback(async () => {
    if (!actionConfig) {
      return;
    }

    setActionLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(actionConfig.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ serviceRequestId: service.serviceRequestId }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? 'No se pudo completar la acción.');
      }

      await refreshService();
      router.refresh();
      setSuccessMessage('Estado actualizado correctamente.');
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo completar la acción.');
    } finally {
      setActionLoading(false);
    }
  }, [actionConfig, refreshService, router, service.serviceRequestId]);

  const handleCancel = useCallback(async () => {
    setCancelling(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const response = await fetch('/api/tech/service/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceRequestId: service.serviceRequestId }),
      });

      const body = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };

      if (!response.ok || !body.ok) {
        throw new Error(body.error ?? 'No se pudo cancelar el servicio.');
      }

      setService((current) => ({
        ...current,
        status: 'cancelled',
      }));
      router.refresh();
      setSuccessMessage('Servicio cancelado. Ya puedes tomar otra solicitud.');
      router.push('/tech/dashboard');
    } catch (error) {
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo cancelar el servicio.');
    } finally {
      setCancelling(false);
    }
  }, [router, service.serviceRequestId]);

  const handleUpdateLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setErrorMessage('Tu dispositivo no soporta geolocalización.');
      return;
    }

    setLocationUpdating(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const response = await fetch('/api/tech/status', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              isOnline: true,
              currentStatus: service.status === 'completed' ? 'available' : 'busy',
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            }),
          });

          if (!response.ok) {
            const body = (await response.json().catch(() => null)) as { error?: string } | null;
            throw new Error(body?.error ?? 'No se pudo actualizar tu ubicación.');
          }

          setSuccessMessage('Ubicación actualizada.');
        } catch (error) {
          console.error(error);
          setErrorMessage(error instanceof Error ? error.message : 'No se pudo actualizar tu ubicación.');
        } finally {
          setLocationUpdating(false);
        }
      },
      (error) => {
        console.error(error);
        setLocationUpdating(false);
        setErrorMessage(geolocationErrorMessage(error));
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, [service.status]);

  return (
    <div className="space-y-6 pb-10">
      <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Servicio activo</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">Ticket #{service.serviceRequestId}</h1>
          </div>
          <span className={`inline-flex items-center rounded-full px-4 py-1 text-sm font-semibold ${statusBadgeClass}`}>
            {statusLabel}
          </span>
        </div>

        <dl className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50/80 p-4">
            <dt className="text-sm font-medium text-slate-500">Creado</dt>
            <dd className="mt-1 text-base font-semibold text-slate-900">{formattedCreatedAt ?? '—'}</dd>
          </div>
          <div className="rounded-2xl bg-slate-50/80 p-4">
            <dt className="text-sm font-medium text-slate-500">Inicio</dt>
            <dd className="mt-1 text-base font-semibold text-slate-900">{formattedStartedAt ?? 'Pendiente'}</dd>
          </div>
          <div className="rounded-2xl bg-slate-50/80 p-4">
            <dt className="text-sm font-medium text-slate-500">Cierre</dt>
            <dd className="mt-1 text-base font-semibold text-slate-900">{formattedCompletedAt ?? 'Pendiente'}</dd>
          </div>
        </dl>

        <div className="mt-6 space-y-3">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Descripción del problema</p>
          <p className="text-base text-slate-800">
            {service.problemDescription?.trim() || 'El cliente no agregó una descripción.'}
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-[1.2fr,0.8fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                <MapPin className="h-4 w-4" aria-hidden />
                Ubicación del cliente
              </div>
              <p className="mt-3 text-sm text-slate-600">
                Coordenadas aproximadas:
                <span className="ml-1 font-semibold text-slate-900">
                  {formatCoordinates(service.clientLocation)}
                </span>
              </p>
            </div>

            {actionConfig ? (
              <button
                type="button"
                onClick={handleAction}
                disabled={actionLoading || service.status === 'cancelled'}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-indigo-600 px-4 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden /> Procesando...
                  </>
                ) : (
                  actionConfig.label
                )}
              </button>
            ) : null}

            {service.status !== 'completed' && service.status !== 'cancelled' ? (
              <button
                type="button"
                onClick={handleCancel}
                disabled={cancelling}
                className="inline-flex w-full items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-base font-semibold text-rose-700 shadow-sm transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {cancelling ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden /> Cancelando...
                  </>
                ) : (
                  <>
                    <XCircle className="mr-2 h-5 w-5" aria-hidden /> Cancelar servicio
                  </>
                )}
              </button>
            ) : null}

            <button
              type="button"
              onClick={handleUpdateLocation}
              disabled={locationUpdating}
              className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {locationUpdating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden /> Guardando ubicación...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-5 w-5" aria-hidden /> Actualizar mi ubicación
                </>
              )}
            </button>
          </div>

          <div className="space-y-4">
            <button
              type="button"
              onClick={refreshService}
              className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-50"
            >
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden /> Refrescar estado
            </button>
            {successMessage ? (
              <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4 text-sm text-emerald-800">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
                <p>{successMessage}</p>
              </div>
            ) : null}
            {errorMessage ? (
              <div className="flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50/80 p-4 text-sm text-rose-700">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
                <p>{errorMessage}</p>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Mapa del cliente</h2>
        <p className="mt-1 text-sm text-slate-600">
          Visualiza la ubicación reportada por el cliente para planificar tu ruta y confirmar la llegada.
        </p>
        <TechServiceMap className="mt-6" clientLocation={service.clientLocation} />
      </section>
    </div>
  );
}

function geolocationErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'Necesitamos tu permiso para leer la ubicación.';
    case error.POSITION_UNAVAILABLE:
      return 'No pudimos obtener tu ubicación actual.';
    case error.TIMEOUT:
      return 'La solicitud de ubicación tardó demasiado.';
    default:
      return 'Ocurrió un problema al obtener tu ubicación.';
  }
}

function formatDateTime(value: string | null): string | null {
  if (!value) {
    return null;
  }

  try {
    return new Intl.DateTimeFormat('es-CL', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch (error) {
    console.error('Unable to format date', error);
    return value;
  }
}

function formatCoordinates(location: ServiceSnapshot['clientLocation']): string {
  if (!location || location.lat == null || location.lng == null) {
    return 'No disponible';
  }

  return `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
}

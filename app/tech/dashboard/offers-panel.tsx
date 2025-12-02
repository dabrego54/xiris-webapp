'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Loader2, MapPin } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import type { TechnicianOfferResponse } from '@/app/api/tech/offers/route';
import type { TechnicianPresenceStatus } from '@/types/database.types';

interface OffersPanelProps {
  initialStatus: TechnicianPresenceStatus;
}

const POLLING_INTERVAL_MS = 6000;

type ActiveServiceResponse = {
  serviceRequestId: string;
  status: string;
  problemDescription: string | null;
  clientLocation: { lat: number | null; lng: number | null };
  startedAt: string | null;
};

export function OffersPanel({ initialStatus }: OffersPanelProps) {
  const [latestOffer, setLatestOffer] = useState<TechnicianOfferResponse | null>(null);
  const [activeService, setActiveService] = useState<ActiveServiceResponse | null>(null);
  const [isBusy, setIsBusy] = useState(initialStatus === 'busy');
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasOffer = Boolean(latestOffer);

  const fetchActiveService = useCallback(async () => {
    try {
      const response = await fetch('/api/tech/service/active', { cache: 'no-store' });

      if (!response.ok) {
        throw new Error('No se pudo cargar el servicio activo.');
      }

      const payload = (await response.json()) as { service: ActiveServiceResponse | null };
      setActiveService(payload.service);

      if (!payload.service) {
        setIsBusy(false);
        return null;
      }

      setIsBusy(true);
      setError(null);
      return payload.service;
    } catch (err) {
      console.error('No se pudo leer el servicio activo del técnico.', err);
      setError('No se pudo leer el servicio activo del técnico.');
      return null;
    }
  }, [initialStatus]);

  const fetchLatestOffer = useCallback(async () => {
    if (isBusy || activeService) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/tech/offers', { cache: 'no-store' });

      if (!response.ok) {
        if (response.status === 401) {
          setError('Debes iniciar sesión nuevamente para recibir ofertas.');
          setLatestOffer(null);
          return;
        }

        throw new Error('No se pudieron cargar las ofertas disponibles.');
      }

      const payload = (await response.json()) as TechnicianOfferResponse[];

      if (payload.length > 0) {
        const [mostRecent] = payload.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setLatestOffer(mostRecent);
      } else {
        setLatestOffer(null);
      }

      setError(null);
    } catch (err) {
      console.error('No se pudieron cargar las ofertas para el técnico.', err);
      setError('Hubo un problema obteniendo nuevas solicitudes.');
    } finally {
      setIsLoading(false);
    }
  }, [activeService, isBusy]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    const poll = async () => {
      setIsLoading(true);
      const service = await fetchActiveService();

      if (service) {
        setIsLoading(false);
        return;
      }

      await fetchLatestOffer();
    };

    void poll();
    intervalId = setInterval(() => {
      void poll();
    }, POLLING_INTERVAL_MS);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [fetchActiveService, fetchLatestOffer]);

  const handleCancel = useCallback(async () => {
    if (!activeService) return;

    setIsCancelling(true);
    setError(null);

    try {
      const response = await fetch('/api/tech/service/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceRequestId: activeService.serviceRequestId }),
      });

      const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };

      if (!response.ok || !payload.ok) {
        const message = payload.error || 'No se pudo cancelar el servicio.';
        throw new Error(message);
      }

      toast.message('Servicio cancelado');
      setActiveService(null);
      setIsBusy(false);
      await fetchLatestOffer();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo cancelar el servicio.';
      toast.error(message);
      setError(message);
    } finally {
      setIsCancelling(false);
    }
  }, [activeService, fetchLatestOffer]);

  const handleAccept = useCallback(async () => {
    if (!latestOffer) {
      return;
    }

    setIsAccepting(true);

    try {
      const response = await fetch('/api/tech/offers/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId: latestOffer.offerId }),
      });

      const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; reason?: string; error?: string };

      if (!response.ok) {
        const message = payload.error || 'No se pudo aceptar la oferta.';
        throw new Error(message);
      }

      if (payload.ok) {
        toast.success('Servicio asignado');
        setIsBusy(true);
        setLatestOffer(null);
        await fetchActiveService();
        return;
      }

      if (payload.reason === 'service_unavailable') {
        toast.error('El servicio ya no está disponible. Buscaremos otra solicitud.');
      } else if (payload.reason === 'offer_expired') {
        toast.error('La oferta expiró. Mantente disponible para nuevas solicitudes.');
      } else {
        toast.error('No se pudo aceptar la oferta.');
      }

      await fetchLatestOffer();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo aceptar la oferta.';
      toast.error(message);
    } finally {
      setIsAccepting(false);
    }
  }, [fetchLatestOffer, latestOffer]);

  const handleReject = useCallback(async () => {
    if (!latestOffer) {
      return;
    }

    setIsRejecting(true);

    try {
      const response = await fetch('/api/tech/offers/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ offerId: latestOffer.offerId }),
      });

      if (!response.ok) {
        const { error: message } = (await response.json().catch(() => ({ error: 'No se pudo rechazar la oferta.' }))) as {
          error?: string;
        };
        throw new Error(message || 'No se pudo rechazar la oferta.');
      }

      toast.message('Oferta rechazada');
      setLatestOffer(null);
      await fetchLatestOffer();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo rechazar la oferta.';
      toast.error(message);
    } finally {
      setIsRejecting(false);
    }
  }, [fetchLatestOffer, latestOffer]);

  const statusLabel = useMemo(() => {
    if (activeService) {
      if (activeService.status === 'candidate_ready') {
        return 'Servicio asignado. Espera la confirmación del cliente.';
      }

      return 'Tienes un servicio activo en curso.';
    }

    if (isBusy) {
      return 'Actualmente estás ocupado con un servicio.';
    }

    if (hasOffer) {
      return 'Tienes una nueva solicitud lista para revisar.';
    }

    if (error) {
      return error;
    }

    return 'Mantente online para recibir solicitudes cercanas.';
  }, [activeService, error, hasOffer, isBusy]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Ofertas en tiempo real</p>
          <h2 className="text-2xl font-semibold text-slate-900">Solicitudes cercanas</h2>
          <p className="text-sm text-slate-600">{statusLabel}</p>
        </div>
        {isLoading && !hasOffer && !error ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Actualizando...
          </div>
        ) : null}
      </div>

      {activeService ? (
        <div className="space-y-4 rounded-2xl border border-amber-100 bg-white p-5 shadow-sm">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-amber-500">
              {activeService.status === 'candidate_ready'
                ? 'Esperando confirmación del cliente'
                : 'Servicio activo'}
            </p>
            <p className="text-lg font-semibold text-slate-900">
              {activeService.problemDescription || 'Servicio asignado'}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {activeService.status === 'candidate_ready'
                ? 'Te avisaremos cuando el cliente confirme para iniciar el servicio.'
                : 'Ingresa al detalle del servicio para comenzar o continuar el trabajo.'}
            </p>
          </div>
          {activeService.clientLocation.lat !== null && activeService.clientLocation.lng !== null ? (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <MapPin className="h-4 w-4 text-amber-500" aria-hidden />
              <span>
                Lat {activeService.clientLocation.lat.toFixed(4)} · Lng {activeService.clientLocation.lng.toFixed(4)}
              </span>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span>
              ID de solicitud: <span className="font-mono">{activeService.serviceRequestId}</span>
            </span>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm">
                <Link href={`/tech/service/${activeService.serviceRequestId}`} prefetch={false}>
                  Ver servicio activo
                </Link>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={handleCancel}
                disabled={isCancelling}
              >
                {isCancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
                Cancelar servicio
              </Button>
            </div>
          </div>
        </div>
      ) : isBusy ? (
        <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-sm text-slate-600">
          Ya tienes un servicio asignado. Te avisaremos cuando finalice para recibir nuevas solicitudes.
        </div>
      ) : hasOffer ? (
        <div className="space-y-4 rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-500">Nueva solicitud disponible</p>
            <p className="text-lg font-semibold text-slate-900">
              {latestOffer?.problemDescription || 'Servicio sin descripción'}
            </p>
            {latestOffer?.serviceRequestStatus && (
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Estado actual: {latestOffer.serviceRequestStatus}
              </p>
            )}
            <p className="mt-1 text-sm text-slate-500">Distancia estimada: próximamente</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <MapPin className="h-4 w-4 text-indigo-500" aria-hidden />
            <span>
              Lat {latestOffer?.location.lat.toFixed(4)} · Lng {latestOffer?.location.lng.toFixed(4)}
            </span>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={handleAccept} disabled={isAccepting || isRejecting}>
              {isAccepting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
              Aceptar servicio
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleReject}
              disabled={isRejecting || isAccepting}
            >
              {isRejecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />}
              Rechazar
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-center text-sm text-slate-500">
          {error || 'Por ahora no hay solicitudes. Te notificaremos en cuanto llegue una nueva.'}
        </div>
      )}
    </section>
  );
}

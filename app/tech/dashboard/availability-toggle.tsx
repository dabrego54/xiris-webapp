'use client';

import { useCallback, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { Switch } from '@/components/ui/switch';
import type { TechnicianPresenceStatus } from '@/types/database.types';

interface AvailabilityToggleProps {
  initialStatus: TechnicianPresenceStatus;
}

async function requestLocation(): Promise<GeolocationPosition> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    throw new Error('Tu navegador no soporta geolocalización.');
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000,
    });
  });
}

export function AvailabilityToggle({ initialStatus }: AvailabilityToggleProps) {
  const [status, setStatus] = useState<TechnicianPresenceStatus>(initialStatus);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOnline = status !== 'offline';
  const statusLabel = status === 'available' ? 'Disponible' : status === 'busy' ? 'Ocupado' : 'Offline';

  const handleToggle = useCallback(
    async (checked: boolean) => {
      setIsSaving(true);
      setError(null);

      try {
        let lat: number | null = null;
        let lng: number | null = null;
        let nextStatus: TechnicianPresenceStatus = 'offline';

        if (checked) {
          const position = await requestLocation();
          lat = position.coords.latitude;
          lng = position.coords.longitude;
          nextStatus = 'available';
        }

        const response = await fetch('/api/tech/status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            isOnline: checked,
            currentStatus: nextStatus,
            lat,
            lng,
          }),
        });

        if (!response.ok) {
          const { error: message } = (await response.json().catch(() => ({ error: 'No se pudo guardar el estado.' }))) as {
            error?: string;
          };
          throw new Error(message || 'No se pudo guardar el estado.');
        }

        setStatus(nextStatus);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'No se pudo actualizar la disponibilidad.';
        setError(message);
      } finally {
        setIsSaving(false);
      }
    },
    []
  );

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Estado actual</p>
        <p className="text-2xl font-semibold text-slate-900">{statusLabel}</p>
        <p className="text-sm text-slate-600">
          {isOnline
            ? 'Estás visible para recibir tickets y compartirás tu ubicación actual.'
            : 'No recibirás nuevas asignaciones hasta que vuelvas a activarte.'}
        </p>
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-slate-700">
          {isOnline ? 'Estoy disponible' : 'Estoy offline'}
        </span>
        <Switch
          checked={isOnline}
          onCheckedChange={handleToggle}
          disabled={isSaving}
          aria-label={isOnline ? 'Cambiar a offline' : 'Cambiar a disponible'}
        />
      </div>
      {isSaving && (
        <p className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Guardando cambios...
        </p>
      )}
      {error && <p className="text-sm text-rose-600">{error}</p>}
    </div>
  );
}

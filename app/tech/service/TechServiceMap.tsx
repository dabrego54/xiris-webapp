'use client';

import { useEffect, useRef, useState } from 'react';

import type { LeafletModule } from '@/components/MapViewport';
import { ensureLeaflet } from '@/components/MapViewport';

export type TechServiceMapProps = {
  clientLocation: {
    lat: number | null;
    lng: number | null;
  } | null;
  className?: string;
};

export default function TechServiceMap({ clientLocation, className }: TechServiceMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      mapRef.current?.remove?.();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    if (!clientLocation || clientLocation.lat == null || clientLocation.lng == null) {
      setMapError('Aún no tenemos la ubicación del cliente.');
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
      return;
    }

    let isCancelled = false;

    ensureLeaflet()
      .then((L: LeafletModule | undefined) => {
        if (isCancelled || !L || !containerRef.current) {
          return;
        }

        setMapError(null);

        if (!mapRef.current) {
          mapRef.current = L.map(containerRef.current, { zoomControl: false });
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors',
          }).addTo(mapRef.current);
        }

        const target = [clientLocation.lat!, clientLocation.lng!] as [number, number];
        mapRef.current.setView(target, 15);

        if (!markerRef.current) {
          markerRef.current = L.marker(target, {
            title: 'Ubicación del cliente',
          }).addTo(mapRef.current);
        } else {
          markerRef.current.setLatLng(target);
        }
      })
      .catch(() => {
        setMapError('No pudimos cargar el mapa. Intenta nuevamente.');
      });

    return () => {
      isCancelled = true;
    };
  }, [clientLocation?.lat, clientLocation?.lng]);

  const showPlaceholder = mapError !== null;

  return (
    <div
      className={`relative h-80 w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 ${className ?? ''}`}
    >
      <div ref={containerRef} className="absolute inset-0" />
      {showPlaceholder ? (
        <div className="absolute inset-0 flex items-center justify-center text-center text-sm text-slate-600">
          {mapError}
        </div>
      ) : null}
    </div>
  );
}

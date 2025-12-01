'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Clock3, Mail, Navigation, Star, User } from 'lucide-react'

import type { LeafletModule } from '@/components/MapViewport'
import { ensureLeaflet } from '@/components/MapViewport'

export type ClientServiceViewProps = {
  serviceRequestId: string
  status: ServiceStatus
  problemDescription: string | null
  location: { lat: number | null; lng: number | null } | null
  technician:
    | null
    | {
        id: string
        fullName: string | null
        email: string
      }
  technicianLocation: { lat: number; lng: number } | null
  startedAt: string | null
  completedAt: string | null
}

export type ServiceStatus = 'accepted' | 'on_route' | 'in_progress' | 'completed'

const STATUS_LABELS: Record<ServiceStatus, string> = {
  accepted: 'Técnico asignado, esperando que inicie el trayecto',
  on_route: 'Técnico en camino',
  in_progress: 'Servicio en curso',
  completed: 'Servicio completado',
}

const POLLING_INTERVAL_MS = 8000

export default function ClientServiceView(initialData: ClientServiceViewProps) {
  const [service, setService] = useState<ClientServiceViewProps>(initialData)
  const [isUpdating, setIsUpdating] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const statusLabel = useMemo(() => STATUS_LABELS[service.status] ?? service.status, [service.status])

  const formattedStartedAt = useMemo(() => formatDateTime(service.startedAt), [service.startedAt])
  const formattedCompletedAt = useMemo(() => formatDateTime(service.completedAt), [service.completedAt])

  const refreshService = useCallback(async () => {
    setIsUpdating(true)
    setErrorMessage(null)

    try {
      const response = await fetch(`/api/client/service/${service.serviceRequestId}`, { cache: 'no-store' })
      if (!response.ok) {
        throw new Error('No pudimos actualizar el servicio.')
      }

      const payload = (await response.json()) as Partial<ClientServiceViewProps>
      setService((current) => ({
        ...current,
        ...payload,
        serviceRequestId: current.serviceRequestId,
        location: payload.location ?? current.location,
      }))
    } catch (error) {
      console.error(error)
      setErrorMessage(error instanceof Error ? error.message : 'No pudimos actualizar el servicio.')
    } finally {
      setIsUpdating(false)
    }
  }, [service.serviceRequestId])

  useEffect(() => {
    void refreshService()

    const interval = setInterval(() => {
      void refreshService()
    }, POLLING_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [refreshService])

  return (
    <div className="space-y-6 pb-10">
      <header className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Ticket #{service.serviceRequestId}</p>
          <h1 className="text-2xl font-semibold text-slate-900">{service.technician?.fullName ?? 'Técnico asignado'}</h1>
          <p className="text-base text-slate-600">{statusLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" /> Volver al dashboard
          </Link>
          {service.status === 'completed' ? (
            <button className="inline-flex items-center gap-2 rounded-full bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-purple-700">
              Calificar técnico
            </button>
          ) : null}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
        <div className="space-y-4">
          <ClientServiceMap clientLocation={service.location} technicianLocation={service.technicianLocation} />

          <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              <Clock3 className="h-4 w-4" aria-hidden />
              Líneas de tiempo
            </div>
            <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-50/70 p-4">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Inicio</dt>
                <dd className="mt-1 text-base font-semibold text-slate-900">{formattedStartedAt ?? 'Pendiente'}</dd>
              </div>
              <div className="rounded-2xl bg-slate-50/70 p-4">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Estado</dt>
                <dd className="mt-1 text-base font-semibold text-slate-900">{statusLabel}</dd>
              </div>
              <div className="rounded-2xl bg-slate-50/70 p-4">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Finalización</dt>
                <dd className="mt-1 text-base font-semibold text-slate-900">{formattedCompletedAt ?? 'Pendiente'}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              <Navigation className="h-4 w-4" aria-hidden />
              Detalles del problema
            </div>
            <p className="mt-3 text-base text-slate-800">
              {service.problemDescription?.trim() || 'El cliente no agregó una descripción.'}
            </p>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-lg font-semibold text-purple-700">
                <User className="h-6 w-6" aria-hidden />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Técnico</p>
                <p className="text-lg font-semibold text-slate-900">{service.technician?.fullName ?? 'Sin asignar'}</p>
                <p className="text-sm text-slate-600">{service.technician?.email ?? 'Pendiente'}</p>
              </div>
            </div>

            {service.status === 'completed' ? (
              <div className="mt-4 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <Star className="h-4 w-4" aria-hidden /> Servicio completado
              </div>
            ) : null}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
            <div className="flex items-center justify-between text-sm font-semibold uppercase tracking-wide text-slate-500">
              <span>Actualizaciones en tiempo real</span>
              {isUpdating ? <span className="text-purple-600">Actualizando…</span> : null}
            </div>
            <p className="mt-3 text-sm text-slate-600">
              Revisamos el estado del servicio y la ubicación del técnico automáticamente cada pocos segundos.
            </p>
            {errorMessage ? <p className="mt-3 text-sm text-rose-600">{errorMessage}</p> : null}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              <Mail className="h-4 w-4" aria-hidden />
              Contacto
            </div>
            <p className="mt-3 text-sm text-slate-700">
              Escríbenos si tienes dudas sobre tu servicio o necesitas ajustar la visita del técnico.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}

type ClientServiceMapProps = {
  clientLocation: { lat: number | null; lng: number | null } | null
  technicianLocation: { lat: number; lng: number } | null
}

function ClientServiceMap({ clientLocation, technicianLocation }: ClientServiceMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const clientMarkerRef = useRef<any>(null)
  const techMarkerRef = useRef<any>(null)
  const [mapError, setMapError] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      mapRef.current?.remove?.()
      mapRef.current = null
      clientMarkerRef.current = null
      techMarkerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!containerRef.current) {
      return
    }

    if (!clientLocation || clientLocation.lat == null || clientLocation.lng == null) {
      setMapError('Aún no tenemos la ubicación del cliente.')
      mapRef.current?.remove?.()
      mapRef.current = null
      clientMarkerRef.current = null
      techMarkerRef.current = null
      return
    }

    let isCancelled = false

    ensureLeaflet()
      .then((L: LeafletModule | undefined) => {
        if (isCancelled || !L || !containerRef.current) {
          return
        }

        setMapError(null)

        if (!mapRef.current) {
          mapRef.current = L.map(containerRef.current, { zoomControl: false })
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap contributors',
          }).addTo(mapRef.current)
        }

        const clientLatLng: [number, number] = [clientLocation.lat!, clientLocation.lng!]

        if (!clientMarkerRef.current) {
          clientMarkerRef.current = L.marker(clientLatLng, {
            title: 'Ubicación del cliente',
          }).addTo(mapRef.current)
        } else {
          clientMarkerRef.current.setLatLng(clientLatLng)
        }

        let bounds = L.latLngBounds([clientLatLng])

        if (technicianLocation?.lat != null && technicianLocation?.lng != null) {
          const techLatLng: [number, number] = [technicianLocation.lat, technicianLocation.lng]
          if (!techMarkerRef.current) {
            techMarkerRef.current = L.marker(techLatLng, {
              title: 'Ubicación del técnico',
            }).addTo(mapRef.current)
          } else {
            techMarkerRef.current.setLatLng(techLatLng)
          }

          bounds = bounds.extend(techLatLng)
        } else if (techMarkerRef.current) {
          techMarkerRef.current.remove()
          techMarkerRef.current = null
        }

        mapRef.current.fitBounds(bounds.pad(0.25))
      })
      .catch(() => {
        setMapError('No pudimos cargar el mapa. Intenta nuevamente.')
      })

    return () => {
      isCancelled = true
    }
  }, [clientLocation?.lat, clientLocation?.lng, technicianLocation?.lat, technicianLocation?.lng])

  const showPlaceholder = mapError !== null

  return (
    <div className="relative h-96 w-full overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
      <div ref={containerRef} className="absolute inset-0" />
      {showPlaceholder ? (
        <div className="absolute inset-0 flex items-center justify-center text-center text-sm text-slate-600">
          {mapError}
        </div>
      ) : null}
    </div>
  )
}

function formatDateTime(input: string | null) {
  if (!input) return null

  const date = new Date(input)
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

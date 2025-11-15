"use client"

/* eslint-disable @next/next/no-img-element */

import { useMemo } from "react"

import { Clock4, MapPin, Wrench } from "lucide-react"

export type TechnicianCandidateCardProps = {
  fullName: string
  email: string
  experience?: string
  distanceKm?: number
  onAccept: () => void
  onReject: () => void
}

const FALLBACK_DISTANCE_KM = 2.1
const FALLBACK_ETA_MINUTES = 12
const FALLBACK_RATING = 4.8

const buildAvatarUrl = (fullName: string) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=EEF2FF&color=4338CA`

const formatDistance = (distanceKm?: number) => {
  if (typeof distanceKm === "number" && !Number.isNaN(distanceKm)) {
    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)} m`
    }

    return `${distanceKm.toFixed(1)} km`
  }

  return `${FALLBACK_DISTANCE_KM.toFixed(1)} km`
}

export default function TechnicianCandidateCard({
  fullName,
  email,
  experience,
  distanceKm,
  onAccept,
  onReject,
}: TechnicianCandidateCardProps) {
  const avatarUrl = useMemo(() => buildAvatarUrl(fullName), [fullName])
  const formattedDistance = formatDistance(distanceKm)
  const etaLabel = `${FALLBACK_ETA_MINUTES} min`

  return (
    <div className="pointer-events-auto w-full max-w-sm overflow-hidden rounded-[28px] bg-white/95 shadow-[0_24px_55px_rgba(15,23,42,0.25)] ring-1 ring-black/5 backdrop-blur">
      <div className="flex items-start gap-4 px-6 pb-4 pt-6">
        <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-purple-100 to-indigo-100">
          <img src={avatarUrl} alt={`Foto de ${fullName}`} className="h-full w-full object-cover" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-purple-500">Técnico encontrado</p>
          <p className="text-2xl font-bold text-gray-900">{fullName}</p>
          <p className="mt-1 text-sm text-gray-500">{experience ?? "Especialista en soporte técnico"}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-yellow-500">⭐ {FALLBACK_RATING.toFixed(1)}</p>
          <p className="text-xs text-gray-400">Rating</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 px-6">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 rounded-2xl border border-gray-100 bg-gray-50/80 px-3 py-2">
            <MapPin className="h-5 w-5 text-purple-500" />
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">Distancia</p>
              <p className="font-semibold text-gray-900">{formattedDistance}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-gray-100 bg-gray-50/80 px-3 py-2">
            <Clock4 className="h-5 w-5 text-purple-500" />
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">Llegada estimada</p>
              <p className="font-semibold text-gray-900">{etaLabel}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-inner">
          <Wrench className="h-5 w-5 text-purple-500" />
          <div className="flex-1 text-sm text-gray-600">
            <p className="font-semibold text-gray-900">Experiencia</p>
            <p className="text-gray-600">{experience ?? "Especialista en soporte técnico"}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-500">
          Contacto: <span className="font-semibold text-gray-900">{email}</span>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 border-t border-gray-100/80 px-6 pb-6 pt-4 sm:flex-row">
        <button
          type="button"
          onClick={onAccept}
          className="w-full rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3 text-center text-base font-semibold text-white shadow-lg shadow-purple-600/40 transition hover:scale-[1.01] hover:shadow-purple-600/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
        >
          Aceptar técnico
        </button>
        <button
          type="button"
          onClick={onReject}
          className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-center text-base font-semibold text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300"
        >
          Buscar otro
        </button>
      </div>
    </div>
  )
}

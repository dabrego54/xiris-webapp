"use client"

import { Navigation } from "lucide-react"

import PrimaryCTA from "./PrimaryCTA"

type MapFloatingControlsProps = {
  onCenter: () => void
  canCenter: boolean
  ctaHref: string
  ctaLabel: string
}

export default function MapFloatingControls({
  onCenter,
  canCenter,
  ctaHref,
  ctaLabel,
}: MapFloatingControlsProps) {
  return (
    <div className="pointer-events-auto flex items-center gap-3">
      <button
        type="button"
        onClick={onCenter}
        disabled={!canCenter}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-lime-400 text-white shadow-lg transition hover:bg-lime-500 disabled:cursor-not-allowed disabled:bg-gray-300"
        aria-label="Centrar mapa"
      >
        <Navigation className="h-6 w-6" />
      </button>

      <PrimaryCTA href={ctaHref}>{ctaLabel}</PrimaryCTA>
    </div>
  )
}

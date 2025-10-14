"use client"

import { MapPin, Navigation } from "lucide-react"

type MapViewportProps = {
  showTechnicians?: boolean
  showRoute?: boolean
  eta?: string
}

export default function MapViewport({ showTechnicians = false, showRoute = false, eta }: MapViewportProps) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-gradient-to-br from-purple-50 to-blue-50">
      {/* Map placeholder with subtle grid */}
      <div
        className="h-full w-full opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(rgba(124, 58, 237, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(124, 58, 237, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Street names overlay */}
      <div className="absolute inset-0">
        <div className="absolute left-[20%] top-[15%] text-xs text-purple-300">Moorgate St</div>
        <div className="absolute left-[10%] top-[35%] text-xs text-purple-300">St. Paul's</div>
        <div className="absolute right-[25%] top-[40%] text-xs text-purple-300">Bank</div>
        <div className="absolute bottom-[30%] left-[15%] text-xs text-purple-300">Mansion House</div>
        <div className="absolute bottom-[25%] left-[35%] text-xs text-purple-300">Cannon Street</div>
        <div className="absolute bottom-[20%] right-[30%] text-xs text-purple-300">Monument</div>
      </div>

      {/* Car icons (technicians) */}
      {showTechnicians && (
        <>
          <div className="absolute left-[25%] top-[30%] animate-pulse">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg">
              <span className="text-xl">🚗</span>
            </div>
          </div>
          <div className="absolute right-[30%] top-[25%] animate-pulse">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg">
              <span className="text-xl">🚗</span>
            </div>
          </div>
          <div className="absolute bottom-[40%] left-[40%] animate-pulse">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg">
              <span className="text-xl">🚗</span>
            </div>
          </div>
        </>
      )}

      {/* User location pin */}
      <div className="absolute bottom-[35%] left-[45%]">
        <div className="relative">
          <div className="absolute -inset-4 animate-ping rounded-full bg-lime-400 opacity-30" />
          <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-lime-400 shadow-lg">
            <MapPin className="h-5 w-5 text-white" fill="white" />
          </div>
        </div>
      </div>

      {/* Route line */}
      {showRoute && (
        <>
          <svg className="absolute inset-0 h-full w-full" style={{ pointerEvents: "none" }}>
            <path d="M 45% 35% Q 60% 25%, 75% 20%" stroke="#7c3aed" strokeWidth="3" fill="none" strokeDasharray="8,4" />
          </svg>

          {/* Technician on route */}
          <div className="absolute right-[25%] top-[20%]">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-600 shadow-lg">
              <span className="text-2xl">🚗</span>
            </div>
          </div>

          {/* ETA bubble */}
          {eta && (
            <div className="absolute right-[20%] top-[12%]">
              <div className="rounded-2xl bg-white px-4 py-2 shadow-lg">
                <div className="flex items-center gap-2">
                  <Navigation className="h-4 w-4 text-purple-600" />
                  <span className="font-bold text-gray-900">{eta}</span>
                  <span className="text-sm text-gray-500">ETA</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Center button */}
      <button
        className="absolute bottom-6 right-6 flex h-12 w-12 items-center justify-center rounded-full bg-lime-400 shadow-lg hover:bg-lime-500"
        aria-label="Centrar mapa"
      >
        <Navigation className="h-6 w-6 text-white" />
      </button>
    </div>
  )
}

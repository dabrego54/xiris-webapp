"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { MapPin, Navigation } from "lucide-react"

import techniciansData from "@/data/technicians.json"

type Technician = {
  id: string
  name: string
  distance?: string
  eta?: string
  location?: {
    lat: number
    lng: number
  }
}

type MapViewportControlProps = {
  centerMap: () => void
  canCenter: boolean
}

type MapViewportProps = {
  showTechnicians?: boolean
  showRoute?: boolean
  eta?: string
  selectedTechnicianId?: string
  renderBottomControls?: (controls: MapViewportControlProps) => ReactNode
}

type LeafletModule = {
  map: (element: HTMLElement, options?: unknown) => any
  tileLayer: (template: string, options?: unknown) => any
  layerGroup: () => any
  circle: (latlng: [number, number], options?: unknown) => any
  circleMarker: (latlng: [number, number], options?: unknown) => any
  marker: (latlng: [number, number], options?: unknown) => any
  polyline: (latlngs: [number, number][], options?: unknown) => any
  divIcon: (options: unknown) => any
  featureGroup: (layers: any[]) => any
}

declare global {
  interface Window {
    L?: LeafletModule
  }
}

const technicians = (techniciansData as Technician[]).filter(
  (technician) =>
    technician.location &&
    typeof technician.location.lat === "number" &&
    typeof technician.location.lng === "number"
)

const DEFAULT_CENTER: [number, number] = [-33.4489, -70.6693]
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"

let leafletLoader: Promise<LeafletModule | undefined> | null = null

function ensureLeaflet(): Promise<LeafletModule | undefined> {
  if (leafletLoader) {
    return leafletLoader
  }

  leafletLoader = new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      resolve(undefined)
      return
    }

    if (window.L) {
      resolve(window.L)
      return
    }

    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const stylesheet = document.createElement("link")
      stylesheet.rel = "stylesheet"
      stylesheet.href = LEAFLET_CSS
      document.head.appendChild(stylesheet)
    }

    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${LEAFLET_JS}"]`)

    const handleResolve = () => {
      resolve(window.L)
    }

    const handleReject = (event: Event) => {
      existingScript?.removeEventListener("load", handleResolve)
      existingScript?.removeEventListener("error", handleReject)
      leafletLoader = null
      reject(event)
    }

    if (existingScript) {
      if (window.L) {
        resolve(window.L)
        return
      }

      existingScript.addEventListener("load", handleResolve, { once: true })
      existingScript.addEventListener("error", handleReject, { once: true })
      return
    }

    const script = document.createElement("script")
    script.src = LEAFLET_JS
    script.async = true
    script.addEventListener("load", handleResolve, { once: true })
    script.addEventListener("error", handleReject, { once: true })
    document.body.appendChild(script)
  })

  return leafletLoader
}

function createTechnicianIcon(L: LeafletModule, highlighted: boolean) {
  return L.divIcon({
    className: "",
    html: `
      <div class="flex h-11 w-11 items-center justify-center rounded-full bg-white text-xl shadow-lg ring-2 ${
        highlighted ? "ring-purple-500 text-purple-600" : "ring-purple-200 text-purple-500"
      }">
        🚗
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  })
}

function geolocationErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return "Permite el acceso a tu ubicación para ver técnicos cercanos."
    case error.POSITION_UNAVAILABLE:
      return "No pudimos obtener tu ubicación actual."
    case error.TIMEOUT:
      return "La solicitud de ubicación ha tardado demasiado."
    default:
      return "Ocurrió un problema al obtener tu ubicación."
  }
}

export default function MapViewport({
  showTechnicians = false,
  showRoute = false,
  eta,
  selectedTechnicianId,
  renderBottomControls,
}: MapViewportProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const userMarkerRef = useRef<any>(null)
  const accuracyCircleRef = useRef<any>(null)
  const techniciansLayerRef = useRef<any>(null)
  const routeLayerRef = useRef<any>(null)
  const routeLineRef = useRef<any>(null)
  const routeDestinationRef = useRef<any>(null)
  const routeOriginRef = useRef<any>(null)
  const hasCenteredOnUserRef = useRef(false)

  const [isMapReady, setIsMapReady] = useState(false)
  const [leafletError, setLeafletError] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null)
  const [geolocationError, setGeolocationError] = useState<string | null>(null)

  const selectedTechnician = useMemo(
    () => technicians.find((technician) => technician.id === selectedTechnicianId),
    [selectedTechnicianId]
  )

  useEffect(() => {
    let isMounted = true

    if (!mapContainerRef.current) {
      return
    }

    ensureLeaflet()
      .then((L) => {
        if (!isMounted || !L || !mapContainerRef.current) {
          return
        }

        const map = L.map(mapContainerRef.current, {
          zoomControl: false,
        })

        map.setView(DEFAULT_CENTER, 13)

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: "&copy; OpenStreetMap contributors",
        }).addTo(map)

        mapRef.current = map
        techniciansLayerRef.current = L.layerGroup().addTo(map)
        routeLayerRef.current = L.layerGroup().addTo(map)

        userMarkerRef.current = L.circleMarker(DEFAULT_CENTER, {
          radius: 8,
          color: "#65a30d",
          fillColor: "#a3e635",
          fillOpacity: 0.8,
          weight: 2,
        }).addTo(map)

        setIsMapReady(true)
      })
      .catch(() => {
        setLeafletError("No se pudo cargar el mapa. Intenta nuevamente.")
      })

    return () => {
      isMounted = false
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setGeolocationError("La geolocalización no está disponible en este dispositivo.")
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setGeolocationError(null)
        setUserLocation([position.coords.latitude, position.coords.longitude])
        setLocationAccuracy(position.coords.accuracy ?? null)
      },
      (error) => {
        setGeolocationError(geolocationErrorMessage(error))
      },
      {
        enableHighAccuracy: true,
        maximumAge: 30_000,
        timeout: 15_000,
      }
    )

    return () => {
      navigator.geolocation.clearWatch(watchId)
    }
  }, [])

  useEffect(() => {
    if (!userLocation) {
      return
    }

    ensureLeaflet().then((L) => {
      if (!L || !mapRef.current) {
        return
      }

      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng(userLocation)
      } else {
        userMarkerRef.current = L.circleMarker(userLocation, {
          radius: 8,
          color: "#65a30d",
          fillColor: "#a3e635",
          fillOpacity: 0.8,
          weight: 2,
        }).addTo(mapRef.current)
      }

      if (typeof locationAccuracy === "number" && locationAccuracy > 0) {
        if (!accuracyCircleRef.current) {
          accuracyCircleRef.current = L.circle(userLocation, {
            radius: locationAccuracy,
            color: "#bef264",
            fillColor: "#bef264",
            fillOpacity: 0.15,
            weight: 1,
          }).addTo(mapRef.current)
        } else {
          accuracyCircleRef.current.setLatLng(userLocation)
          accuracyCircleRef.current.setRadius(locationAccuracy)
        }
      } else if (accuracyCircleRef.current) {
        accuracyCircleRef.current.remove()
        accuracyCircleRef.current = null
      }

      if (!hasCenteredOnUserRef.current) {
        mapRef.current.flyTo(userLocation, 15, {
          animate: true,
          duration: 0.8,
        })
        hasCenteredOnUserRef.current = true
      }
    })
  }, [locationAccuracy, userLocation])

  useEffect(() => {
    if (!mapRef.current || !techniciansLayerRef.current) {
      return
    }

    ensureLeaflet().then((L) => {
      if (!L || !techniciansLayerRef.current) {
        return
      }

      techniciansLayerRef.current.clearLayers()

      if (!showTechnicians && !showRoute) {
        return
      }

      technicians.forEach((technician) => {
        if (!technician.location) {
          return
        }

        const marker = L.marker([technician.location.lat, technician.location.lng], {
          icon: createTechnicianIcon(L, technician.id === selectedTechnicianId),
        })

        const details: string[] = []
        if (technician.distance) {
          details.push(technician.distance)
        }
        if (technician.eta) {
          details.push(`ETA ${technician.eta}`)
        }

        marker.bindPopup(
          `
            <div class="space-y-1">
              <p class="text-sm font-semibold text-gray-900">${technician.name}</p>
              ${
                details.length > 0
                  ? `<p class="text-xs text-gray-500">${details.join(" · ")}</p>`
                  : ""
              }
            </div>
          `
        )

        techniciansLayerRef.current.addLayer(marker)

        if (technician.id === selectedTechnicianId) {
          marker.openPopup()
        }
      })
    })
  }, [selectedTechnicianId, showRoute, showTechnicians])

  useEffect(() => {
    if (!routeLayerRef.current || !mapRef.current) {
      return
    }

    ensureLeaflet().then((L) => {
      if (!L || !routeLayerRef.current) {
        return
      }

      if (!showRoute) {
        routeLayerRef.current.clearLayers()
        routeLineRef.current = null
        routeDestinationRef.current = null
        routeOriginRef.current = null
        return
      }

      const destination = selectedTechnician ?? technicians[0]
      if (!destination?.location) {
        return
      }

      const origin = userLocation ?? DEFAULT_CENTER
      const destinationLatLng: [number, number] = [destination.location.lat, destination.location.lng]

      if (!routeLineRef.current) {
        routeLayerRef.current.clearLayers()

        routeLineRef.current = L.polyline([origin, destinationLatLng], {
          color: "#7c3aed",
          weight: 4,
          dashArray: "12 8",
          lineCap: "round",
        }).addTo(routeLayerRef.current)

        routeOriginRef.current = L.circleMarker(origin, {
          radius: 8,
          color: "#65a30d",
          fillColor: "#a3e635",
          fillOpacity: 0.9,
          weight: 2,
        }).addTo(routeLayerRef.current)

        routeDestinationRef.current = L.marker(destinationLatLng, {
          icon: createTechnicianIcon(L, true),
        }).addTo(routeLayerRef.current)

        const bounds = routeLineRef.current.getBounds().pad(0.35)
        mapRef.current.fitBounds(bounds, { animate: true })
        return
      }

      routeLineRef.current.setLatLngs([origin, destinationLatLng])
      routeOriginRef.current?.setLatLng(origin)
      routeDestinationRef.current?.setLatLng(destinationLatLng)
    })
  }, [selectedTechnician, showRoute, userLocation])

  const handleCenter = useCallback(() => {
    if (!mapRef.current || !userLocation) {
      return
    }

    mapRef.current.flyTo(userLocation, Math.max(mapRef.current.getZoom(), 15), {
      animate: true,
      duration: 0.6,
    })
  }, [userLocation])

  const canCenter = Boolean(userLocation) && !leafletError

  const bottomControls = renderBottomControls?.({
    centerMap: handleCenter,
    canCenter,
  })

  return (
    <div className="relative isolate h-full w-full">
      <div ref={mapContainerRef} className="h-full w-full" />

      {!isMapReady && !leafletError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
          <span className="text-sm font-medium text-purple-600">Cargando mapa...</span>
        </div>
      )}

      {leafletError && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/80 p-6 text-center text-sm font-medium text-red-500">
          {leafletError}
        </div>
      )}

      <div className="pointer-events-none absolute left-4 top-4 z-[10000] flex max-w-xs flex-col gap-2">
        <div className="pointer-events-auto rounded-2xl bg-white/90 px-4 py-3 shadow-lg backdrop-blur">
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 text-purple-600" />
            <div className="text-xs text-gray-600">
              {userLocation && !geolocationError && <p className="font-semibold text-gray-900">Ubicación detectada</p>}
              {!userLocation && !geolocationError && <p>Obteniendo tu ubicación en tiempo real…</p>}
              {geolocationError && <p>{geolocationError}</p>}
            </div>
          </div>
        </div>

        {selectedTechnician && showRoute && (
          <div className="pointer-events-auto rounded-2xl bg-white/90 px-4 py-3 text-xs shadow-lg backdrop-blur">
            <p className="font-semibold text-gray-900">{selectedTechnician.name}</p>
            {selectedTechnician.distance && (
              <p className="text-gray-500">A {selectedTechnician.distance}</p>
            )}
          </div>
        )}
      </div>

      {showRoute && eta && (
        <div className="pointer-events-none absolute right-4 top-4 z-[10000]">
          <div className="rounded-2xl bg-white/90 px-4 py-3 shadow-lg backdrop-blur">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <Navigation className="h-4 w-4 text-purple-600" />
              <span>{eta}</span>
              <span className="text-xs font-normal text-gray-500">ETA</span>
            </div>
            {selectedTechnician && (
              <p className="mt-1 text-xs text-gray-500">Rumbo a {selectedTechnician.name}</p>
            )}
          </div>
        </div>
      )}

      {bottomControls ? (
        <div className="pointer-events-none absolute bottom-24 left-1/2 z-[10000] flex -translate-x-1/2 items-center gap-3 lg:bottom-8 lg:left-auto lg:right-8 lg:translate-x-0">
          {bottomControls}
        </div>
      ) : (
        <button
          type="button"
          onClick={handleCenter}
          disabled={!canCenter}
          className="pointer-events-auto absolute bottom-6 left-6 z-[10000] flex h-12 w-12 items-center justify-center rounded-full bg-lime-400 text-white shadow-lg transition hover:bg-lime-500 disabled:cursor-not-allowed disabled:bg-gray-300 lg:bottom-8 lg:left-auto lg:right-32"
          aria-label="Centrar mapa"
        >
          <Navigation className="h-6 w-6" />
        </button>
      )}
    </div>
  )
}

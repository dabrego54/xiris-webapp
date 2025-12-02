"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import AppShell from "@/components/AppShell"
import MapViewportWithFloatingControls from "@/components/MapViewportWithFloatingControls"

const POLLING_INTERVAL_MS = 6000

type RequestStatus =
  | "idle"
  | "requested"
  | "searching"
  | "candidate_ready"
  | "accepted"
  | "on_route"
  | "in_progress"
  | "completed"
  | "cancelled"

type TechnicianCandidate = {
  id: string
  fullName: string
  avatarUrl: string | null
  phone: string | null
  rating: number | null
  experience: string | null
  skills: string[] | null
  serviceAreas: string[] | null
  totalServices: number | null
  isVerified: boolean | null
  availabilityStatus: string | null
  presenceStatus: string | null
  isOnline: boolean | null
  distanceLabel: string | null
}

const availabilityStatusLabels: Record<string, string> = {
  online: "Disponible",
  offline: "Fuera de línea",
  busy: "Ocupado",
}

const presenceStatusLabels: Record<string, string> = {
  available: "Disponible",
  busy: "Ocupado",
  offline: "Fuera de línea",
}

const getInitials = (fullName: string) => {
  return fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("")
}

export default function DashboardPage() {
  const [currentServiceRequestId, setCurrentServiceRequestId] = useState<string | null>(null)
  const [requestStatus, setRequestStatus] = useState<RequestStatus>("idle")
  const [technicianCandidate, setTechnicianCandidate] = useState<TechnicianCandidate | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [serviceLocation, setServiceLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [technicianLocation, setTechnicianLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [isRequestingTechnician, setIsRequestingTechnician] = useState(false)
  const [isCandidateActionLoading, setIsCandidateActionLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const canRequestTechnician =
    Boolean(userLocation) && (requestStatus === "idle" || requestStatus === "cancelled" || requestStatus === "completed")

  const handleLocationUpdate = useCallback((location: { lat: number; lng: number } | null) => {
    setUserLocation(location)
  }, [])

  const handleCreateRequest = useCallback(async () => {
    if (!userLocation || !canRequestTechnician) {
      return
    }

    setIsRequestingTechnician(true)
    setErrorMessage(null)

    try {
      const response = await fetch("/api/client/create-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemDescription: "Problema reportado desde el dashboard",
          lat: userLocation.lat,
          lng: userLocation.lng,
        }),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok || !payload?.serviceRequestId) {
        throw new Error(payload?.error ?? "No se pudo crear la solicitud.")
      }

      setCurrentServiceRequestId(payload.serviceRequestId)
      setRequestStatus("searching")
      setTechnicianCandidate(null)
      setServiceLocation(userLocation)
      setTechnicianLocation(null)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo crear la solicitud.")
    } finally {
      setIsRequestingTechnician(false)
    }
  }, [canRequestTechnician, userLocation])

  const ctaLabel = useMemo(() => {
    switch (requestStatus) {
      case "idle":
      case "cancelled":
        return "Buscar técnico"
      case "searching":
      case "requested":
        return "Buscando técnicos…"
      case "candidate_ready":
        return "Técnico encontrado"
      case "accepted":
      case "on_route":
      case "in_progress":
      case "completed":
        return "Ver detalle del servicio"
      default:
        return "Buscar técnico"
    }
  }, [requestStatus])

  const hasDetailLink =
    currentServiceRequestId && ["accepted", "on_route", "in_progress", "completed"].includes(requestStatus)
  const ctaHref = hasDetailLink && currentServiceRequestId ? `/client/service/${currentServiceRequestId}` : undefined
  const ctaOnClick =
    !hasDetailLink && canRequestTechnician && !isRequestingTechnician ? handleCreateRequest : undefined
  const ctaDisabled = Boolean(ctaHref) ? false : !ctaOnClick

  const effectiveClientLocation = userLocation ?? serviceLocation
  const isTrackingRoute =
    ["accepted", "on_route", "in_progress"].includes(requestStatus) && Boolean(technicianLocation)
  const routeDestination = technicianLocation
    ? { ...technicianLocation, label: technicianCandidate?.fullName ?? "Técnico asignado" }
    : null

  const refreshServiceRequest = useCallback(async () => {
    if (!currentServiceRequestId) {
      return
    }

    try {
      const response = await fetch(`/api/client/request/${currentServiceRequestId}`)

      if (response.status === 404) {
        setCurrentServiceRequestId(null)
        setTechnicianCandidate(null)
        setTechnicianLocation(null)
        setServiceLocation(null)
        setRequestStatus("idle")
        return
      }

      const payload = await response.json().catch(() => null)

      if (!response.ok || !payload) {
        throw new Error(payload?.error ?? "No se pudo obtener el estado de la solicitud.")
      }

      setRequestStatus(payload.status as RequestStatus)
      setTechnicianCandidate(payload.technicianCandidate ?? null)

      const nextServiceLocation =
        typeof payload?.location?.lat === "number" && typeof payload.location?.lng === "number"
          ? ({ lat: payload.location.lat, lng: payload.location.lng } as const)
          : null

      setServiceLocation(nextServiceLocation)

      const nextTechnicianLocation =
        typeof payload?.technicianLocation?.lat === "number" && typeof payload.technicianLocation?.lng === "number"
          ? ({ lat: payload.technicianLocation.lat, lng: payload.technicianLocation.lng } as const)
          : null

      setTechnicianLocation(nextTechnicianLocation)

      if (payload.status === "cancelled") {
        setCurrentServiceRequestId(null)
        setTechnicianLocation(null)
        setServiceLocation(null)
      }

      if (payload.status === "completed") {
        setTechnicianLocation(null)
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo actualizar la solicitud.")
    }
  }, [currentServiceRequestId])

  const refreshServiceTracking = useCallback(async () => {
    if (!currentServiceRequestId) {
      return
    }

    try {
      const response = await fetch(`/api/client/service/${currentServiceRequestId}`, { cache: "no-store" })

      if (!response.ok) {
        throw new Error("No se pudo actualizar la ubicación del técnico.")
      }

      const payload = await response.json().catch(() => null)

      const nextServiceLocation =
        typeof payload?.location?.lat === "number" && typeof payload.location?.lng === "number"
          ? ({ lat: payload.location.lat, lng: payload.location.lng } as const)
          : null

      const nextTechnicianLocation =
        typeof payload?.technicianLocation?.lat === "number" &&
        typeof payload.technicianLocation?.lng === "number"
          ? ({ lat: payload.technicianLocation.lat, lng: payload.technicianLocation.lng } as const)
          : null

      setRequestStatus((payload?.status as RequestStatus | undefined) ?? requestStatus)
      setServiceLocation(nextServiceLocation)
      setTechnicianLocation(nextTechnicianLocation)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo actualizar la ubicación del técnico.")
    }
  }, [currentServiceRequestId])

  useEffect(() => {
    const restoreActiveService = async () => {
      const storedServiceRequestId = localStorage.getItem("activeServiceRequestId")

      if (storedServiceRequestId) {
        setCurrentServiceRequestId(storedServiceRequestId)
      }

      try {
        const response = await fetch("/api/client/request/active", { cache: "no-store" })
        const payload = await response.json().catch(() => null)

        if (!response.ok) {
          return
        }

        if (!payload?.service) {
          setCurrentServiceRequestId(null)
          setTechnicianCandidate(null)
          setTechnicianLocation(null)
          setServiceLocation(null)
          setRequestStatus("idle")
          return
        }

        const activeService = payload.service as {
          id: string
          status: RequestStatus
          location: { lat: number | null; lng: number | null } | null
          technicianCandidate?: TechnicianCandidate | null
          technicianLocation?: { lat: number | null; lng: number | null } | null
        }

        setCurrentServiceRequestId(activeService.id)
        setRequestStatus(activeService.status)

        const nextServiceLocation =
          typeof activeService.location?.lat === "number" && typeof activeService.location?.lng === "number"
            ? ({ lat: activeService.location.lat, lng: activeService.location.lng } as const)
            : null

        if (nextServiceLocation) {
          setServiceLocation(nextServiceLocation)
        }

        if (activeService.technicianCandidate) {
          setTechnicianCandidate(activeService.technicianCandidate)
        }

        if (
          typeof activeService.technicianLocation?.lat === "number" &&
          typeof activeService.technicianLocation?.lng === "number"
        ) {
          setTechnicianLocation({
            lat: activeService.technicianLocation.lat,
            lng: activeService.technicianLocation.lng,
          })
        }
      } catch (error) {
        console.error("No se pudo restaurar el servicio activo", error)
      }
    }

    void restoreActiveService()
  }, [])

  useEffect(() => {
    if (currentServiceRequestId && requestStatus !== "cancelled" && requestStatus !== "completed") {
      localStorage.setItem("activeServiceRequestId", currentServiceRequestId)
    } else {
      localStorage.removeItem("activeServiceRequestId")
    }
  }, [currentServiceRequestId, requestStatus])

  useEffect(() => {
    if (!currentServiceRequestId) {
      return
    }

    void refreshServiceRequest()

    const interval = setInterval(() => {
      void refreshServiceRequest()
    }, POLLING_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [currentServiceRequestId, refreshServiceRequest])

  useEffect(() => {
    if (
      !currentServiceRequestId ||
      !["accepted", "on_route", "in_progress"].includes(requestStatus)
    ) {
      return
    }

    void refreshServiceTracking()

    const interval = setInterval(() => {
      void refreshServiceTracking()
    }, POLLING_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [currentServiceRequestId, refreshServiceTracking, requestStatus])

  const handleAcceptTechnician = useCallback(async () => {
    if (!currentServiceRequestId || requestStatus !== "candidate_ready") {
      return
    }

    setIsCandidateActionLoading(true)
    setErrorMessage(null)

    try {
      const response = await fetch("/api/client/accept-technician", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceRequestId: currentServiceRequestId }),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error ?? "No se pudo aceptar al técnico.")
      }

      setRequestStatus("accepted")
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo aceptar al técnico.")
    } finally {
      setIsCandidateActionLoading(false)
    }
  }, [currentServiceRequestId, requestStatus])

  const handleRejectTechnician = useCallback(async () => {
    if (!currentServiceRequestId || requestStatus !== "candidate_ready") {
      return
    }

    setIsCandidateActionLoading(true)
    setErrorMessage(null)

    try {
      const response = await fetch("/api/client/reject-technician", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceRequestId: currentServiceRequestId }),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error ?? "No se pudo rechazar al técnico.")
      }

      setTechnicianCandidate(null)
      setRequestStatus("searching")
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo rechazar al técnico.")
    } finally {
      setIsCandidateActionLoading(false)
    }
  }, [currentServiceRequestId, requestStatus])

  return (
    <AppShell>
      <div className="relative h-full w-full">
        <MapViewportWithFloatingControls
          ctaLabel={ctaLabel}
          ctaHref={ctaHref}
          ctaOnClick={ctaOnClick}
          ctaDisabled={ctaDisabled}
          manualUserLocation={effectiveClientLocation}
          showRoute={isTrackingRoute}
          routeDestination={routeDestination}
          onUserLocationChange={handleLocationUpdate}
        />

        {errorMessage && (
          <div className="pointer-events-none absolute left-1/2 top-4 z-[11000] w-full max-w-md -translate-x-1/2 px-4">
            <div className="pointer-events-auto rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 shadow-lg">
              {errorMessage}
            </div>
          </div>
        )}

        {requestStatus === "candidate_ready" && technicianCandidate && (
          <div className="pointer-events-none absolute bottom-32 left-1/2 z-[11000] w-full max-w-md -translate-x-1/2 px-4 lg:left-auto lg:right-8 lg:translate-x-0">
            <div className="pointer-events-auto rounded-3xl bg-white p-6 shadow-2xl">
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-2xl bg-gray-100">
                  {technicianCandidate.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={technicianCandidate.avatarUrl}
                      alt={technicianCandidate.fullName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-gray-500">
                      {getInitials(technicianCandidate.fullName)}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-purple-600">Técnico encontrado</p>
                    {technicianCandidate.isVerified && (
                      <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">
                        Verificado
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-2xl font-bold text-gray-900">{technicianCandidate.fullName}</p>
                  {technicianCandidate.skills && technicianCandidate.skills.length > 0 && (
                    <p className="mt-1 text-sm text-gray-600">
                      Especialista en {technicianCandidate.skills.slice(0, 3).join(", ")}
                      {technicianCandidate.skills.length > 3 ? "…" : ""}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                    {technicianCandidate.distanceLabel && <span>A {technicianCandidate.distanceLabel}</span>}
                    {technicianCandidate.availabilityStatus && (
                      <span>
                        Disponibilidad: {availabilityStatusLabels[technicianCandidate.availabilityStatus] ?? "—"}
                      </span>
                    )}
                    {technicianCandidate.presenceStatus && (
                      <span>
                        Estado: {presenceStatusLabels[technicianCandidate.presenceStatus] ?? technicianCandidate.presenceStatus}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-yellow-500">
                    ⭐ {technicianCandidate.rating ? technicianCandidate.rating.toFixed(1) : "4.9"}
                  </p>
                  {typeof technicianCandidate.totalServices === "number" && (
                    <p className="text-xs text-gray-500">{technicianCandidate.totalServices} servicios</p>
                  )}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Calificación</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {technicianCandidate.rating ? technicianCandidate.rating.toFixed(1) : "4.9"}
                  </p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-3">
                  <p className="text-xs text-gray-500">Servicios completados</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {technicianCandidate.totalServices ?? "—"}
                  </p>
                </div>
              </div>

              {technicianCandidate.serviceAreas && technicianCandidate.serviceAreas.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Áreas de servicio</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {technicianCandidate.serviceAreas.slice(0, 4).map((area) => (
                      <span key={area} className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">
                        {area}
                      </span>
                    ))}
                    {technicianCandidate.serviceAreas.length > 4 && (
                      <span className="text-xs text-gray-500">
                        +{technicianCandidate.serviceAreas.length - 4} más
                      </span>
                    )}
                  </div>
                </div>
              )}

              {technicianCandidate.phone && (
                <div className="mt-4 text-sm text-gray-600">
                  Contacto directo: <span className="font-semibold">{technicianCandidate.phone}</span>
                </div>
              )}

              {technicianCandidate.experience && (
                <p className="mt-4 text-sm text-gray-600">{technicianCandidate.experience}</p>
              )}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleAcceptTechnician}
                  disabled={isCandidateActionLoading}
                  className="flex-1 rounded-2xl bg-purple-600 px-4 py-3 text-center font-semibold text-white shadow-lg transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Aceptar técnico
                </button>
                <button
                  type="button"
                  onClick={handleRejectTechnician}
                  disabled={isCandidateActionLoading}
                  className="flex-1 rounded-2xl bg-gray-100 px-4 py-3 text-center font-semibold text-gray-700 shadow hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Buscar otro
                </button>
              </div>
            </div>
          </div>
        )}

        {requestStatus === "accepted" && (
          <div className="pointer-events-none absolute bottom-32 left-1/2 z-[11000] w-full max-w-md -translate-x-1/2 px-4 lg:left-auto lg:right-8 lg:translate-x-0">
            <div className="pointer-events-auto rounded-3xl bg-white/90 px-4 py-3 text-center text-sm font-semibold text-purple-700 shadow-xl">
              Técnico en camino 🚗
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}

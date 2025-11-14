"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import AppShell from "@/components/AppShell"
import MapViewportWithFloatingControls from "@/components/MapViewportWithFloatingControls"

const POLLING_INTERVAL_MS = 6000

type RequestStatus = "idle" | "requested" | "searching" | "candidate_ready" | "accepted" | "cancelled"

type TechnicianCandidate = {
  id: string
  fullName: string
  rating: number | null
  experience: string | null
  skills: string[] | null
  distanceLabel: string | null
}

export default function DashboardPage() {
  const [currentServiceRequestId, setCurrentServiceRequestId] = useState<string | null>(null)
  const [requestStatus, setRequestStatus] = useState<RequestStatus>("idle")
  const [technicianCandidate, setTechnicianCandidate] = useState<TechnicianCandidate | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [isRequestingTechnician, setIsRequestingTechnician] = useState(false)
  const [isCandidateActionLoading, setIsCandidateActionLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const canRequestTechnician = Boolean(userLocation) && (requestStatus === "idle" || requestStatus === "cancelled")

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
        return "Técnico en camino"
      default:
        return "Buscar técnico"
    }
  }, [requestStatus])

  const ctaDisabled = !canRequestTechnician || isRequestingTechnician

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
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo crear la solicitud.")
    } finally {
      setIsRequestingTechnician(false)
    }
  }, [canRequestTechnician, userLocation])

  const refreshServiceRequest = useCallback(async () => {
    if (!currentServiceRequestId) {
      return
    }

    try {
      const response = await fetch(`/api/client/request/${currentServiceRequestId}`)

      if (response.status === 404) {
        setCurrentServiceRequestId(null)
        setTechnicianCandidate(null)
        setRequestStatus("idle")
        return
      }

      const payload = await response.json().catch(() => null)

      if (!response.ok || !payload) {
        throw new Error(payload?.error ?? "No se pudo obtener el estado de la solicitud.")
      }

      setRequestStatus(payload.status as RequestStatus)
      setTechnicianCandidate(payload.technicianCandidate ?? null)

      if (payload.status === "cancelled") {
        setCurrentServiceRequestId(null)
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo actualizar la solicitud.")
    }
  }, [currentServiceRequestId])

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
          ctaOnClick={canRequestTechnician ? handleCreateRequest : undefined}
          ctaDisabled={ctaDisabled}
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
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-purple-600">Técnico encontrado</p>
                  <p className="text-2xl font-bold text-gray-900">{technicianCandidate.fullName}</p>
                  {technicianCandidate.skills && technicianCandidate.skills.length > 0 && (
                    <p className="mt-1 text-sm text-gray-500">
                      Especialista en {technicianCandidate.skills.slice(0, 2).join(", ")}
                      {technicianCandidate.skills.length > 2 ? "…" : ""}
                    </p>
                  )}
                  {technicianCandidate.experience && (
                    <p className="text-sm text-gray-500">{technicianCandidate.experience}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-yellow-500">
                    ⭐ {technicianCandidate.rating ? technicianCandidate.rating.toFixed(1) : "4.9"}
                  </p>
                  {technicianCandidate.distanceLabel && (
                    <p className="text-xs text-gray-500">A {technicianCandidate.distanceLabel}</p>
                  )}
                </div>
              </div>

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

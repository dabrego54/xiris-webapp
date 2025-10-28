import type { ApplicationStatus } from "@/types/database.types"

export const APPLICATION_STATUS_INFO: Record<
  ApplicationStatus,
  { label: string; badgeClass: string }
> = {
  submitted: {
    label: "Enviada",
    badgeClass: "bg-blue-50 text-blue-600",
  },
  under_review: {
    label: "En revisión",
    badgeClass: "bg-amber-50 text-amber-600",
  },
  approved: {
    label: "Aprobada",
    badgeClass: "bg-emerald-50 text-emerald-600",
  },
  rejected: {
    label: "Rechazada",
    badgeClass: "bg-rose-50 text-rose-600",
  },
}

export function getStatusInfo(status: ApplicationStatus) {
  return APPLICATION_STATUS_INFO[status]
}

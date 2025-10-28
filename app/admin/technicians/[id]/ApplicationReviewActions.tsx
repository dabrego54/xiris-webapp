"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { moveApplicationToUnderReview, submitApplicationDecision } from "../actions"
import type { ApplicationStatus } from "@/types/database.types"

type Decision = "approved" | "rejected"

interface ApplicationReviewActionsProps {
  applicationId: string
  status: ApplicationStatus
  existingReviewNotes: string | null
}

export function ApplicationReviewActions({
  applicationId,
  status,
  existingReviewNotes,
}: ApplicationReviewActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [dialogDecision, setDialogDecision] = useState<Decision | null>(null)
  const [reviewNotes, setReviewNotes] = useState(existingReviewNotes ?? "")

  const isUnderReview = status === "under_review"
  const isSubmitted = status === "submitted"
  const isFinalized = status === "approved" || status === "rejected"

  const dialogTitle = useMemo(() => {
    if (dialogDecision === "approved") {
      return "Aprobar postulación"
    }
    if (dialogDecision === "rejected") {
      return "Rechazar postulación"
    }
    return ""
  }, [dialogDecision])

  const dialogDescription = useMemo(() => {
    if (dialogDecision === "approved") {
      return "Comparte notas de la revisión antes de aprobar la postulación."
    }
    if (dialogDecision === "rejected") {
      return "Explica brevemente por qué rechazas la postulación."
    }
    return ""
  }, [dialogDecision])

  function handleDialogOpenChange(open: boolean) {
    if (!open) {
      setDialogDecision(null)
    }
  }

  function openDecisionDialog(decision: Decision) {
    setDialogDecision(decision)
  }

  function handleMoveToUnderReview() {
    startTransition(async () => {
      const result = await moveApplicationToUnderReview(applicationId)

      if (!result.success) {
        toast.error(result.error ?? "No pudimos actualizar el estado de la postulación.")
        return
      }

      toast.success("La postulación ahora está en revisión.")
      router.refresh()
    })
  }

  function handleSubmitDecision() {
    if (!dialogDecision) {
      return
    }

    startTransition(async () => {
      const result = await submitApplicationDecision({
        applicationId,
        decision: dialogDecision,
        reviewNotes,
      })

      if (!result.success) {
        toast.error(result.error ?? "No pudimos registrar tu decisión.")
        return
      }

      if (dialogDecision === "approved") {
        toast.success("Postulación aprobada correctamente.")
        router.push("/admin/technicians")
      } else {
        toast.success("Postulación rechazada correctamente.")
        router.refresh()
      }

      setDialogDecision(null)
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        type="button"
        variant="outline"
        disabled={!isSubmitted || isPending}
        onClick={handleMoveToUnderReview}
      >
        Mover a Under Review
      </Button>

      <Button
        type="button"
        variant="default"
        disabled={isFinalized || !isUnderReview || isPending}
        onClick={() => openDecisionDialog("approved")}
      >
        Aprobar
      </Button>

      <Button
        type="button"
        variant="destructive"
        disabled={isFinalized || !isUnderReview || isPending}
        onClick={() => openDecisionDialog("rejected")}
      >
        Rechazar
      </Button>

      <Dialog open={dialogDecision !== null} onOpenChange={handleDialogOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>{dialogDescription}</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700" htmlFor="review-notes">
              Notas de la revisión
            </label>
            <textarea
              id="review-notes"
              className="h-32 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6]/60"
              value={reviewNotes}
              onChange={(event) => setReviewNotes(event.target.value)}
              placeholder="Escribe un resumen de tu evaluación"
              disabled={isPending}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogDecision(null)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={handleSubmitDecision} disabled={isPending}>
              {dialogDecision === "approved" ? "Confirmar aprobación" : "Confirmar rechazo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

"use client"

import { useState, useTransition } from "react"
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
import type { ApplicationStatus } from "@/types/database.types"
import {
  moveToUnderReviewAction,
  submitApplicationDecisionAction,
} from "../actions"

type Props = {
  applicationId: string
  status: ApplicationStatus
}

export default function ApplicationActions({ applicationId, status }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [approveOpen, setApproveOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [approveNotes, setApproveNotes] = useState("")
  const [rejectNotes, setRejectNotes] = useState("")

  const isFinal = status === "approved" || status === "rejected"
  const canMoveToUnderReview = status === "submitted"
  const canDecide = status === "under_review"

  function handleUnderReview(): void {
    startTransition(() => {
      moveToUnderReviewAction(applicationId).then((result) => {
        if (result.success) {
          toast.success(result.message)
          router.refresh()
        } else {
          toast.error(result.message)
        }
      })
    })
  }

  function handleDecision(decision: "approved" | "rejected"): void {
    const notes = decision === "approved" ? approveNotes : rejectNotes

    startTransition(() => {
      submitApplicationDecisionAction({
        applicationId,
        decision,
        reviewNotes: notes,
      }).then((result) => {
        if (result.success) {
          toast.success(result.message)

          if (decision === "approved") {
            setApproveOpen(false)
            setApproveNotes("")
            router.push("/admin/technicians")
            router.refresh()
          } else {
            setRejectOpen(false)
            setRejectNotes("")
            router.refresh()
          }
        } else {
          toast.error(result.message)
        }
      })
    })
  }

  function closeApprove(open: boolean) {
    if (!open && !isPending) {
      setApproveNotes("")
    }
    setApproveOpen(open)
  }

  function closeReject(open: boolean) {
    if (!open && !isPending) {
      setRejectNotes("")
    }
    setRejectOpen(open)
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Button
        variant="secondary"
        disabled={!canMoveToUnderReview || isPending || isFinal}
        onClick={handleUnderReview}
      >
        Mover a Under Review
      </Button>

      <Dialog open={approveOpen} onOpenChange={closeApprove}>
        <Button
          variant="default"
          disabled={!canDecide || isPending}
          onClick={() => closeApprove(true)}
        >
          Aprobar
        </Button>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprobar postulación</DialogTitle>
            <DialogDescription>
              Agrega notas para el técnico. Se incluirán en la notificación de
              aprobación.
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={approveNotes}
            onChange={(event) => setApproveNotes(event.target.value)}
            placeholder="Notas para el técnico (opcional)"
            className="min-h-28 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 focus:border-[#7C3AED] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/50"
          />
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => closeApprove(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => handleDecision("approved")}
              disabled={isPending}
            >
              Confirmar aprobación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={closeReject}>
        <Button
          variant="destructive"
          disabled={!canDecide || isPending}
          onClick={() => closeReject(true)}
        >
          Rechazar
        </Button>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar postulación</DialogTitle>
            <DialogDescription>
              Comparte el motivo del rechazo para que el técnico pueda mejorar.
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={rejectNotes}
            onChange={(event) => setRejectNotes(event.target.value)}
            placeholder="Notas para el técnico (opcional)"
            className="min-h-28 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 focus:border-[#7C3AED] focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/50"
          />
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => closeReject(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => handleDecision("rejected")}
              disabled={isPending}
            >
              Confirmar rechazo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

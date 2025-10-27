"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
type Decision = "approved" | "rejected"

type ActionResult = {
  success: boolean
  message: string
}

type DecisionResult = ActionResult

export async function moveToUnderReviewAction(applicationId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    console.error("Error resolving current user", authError)
    return {
      success: false,
      message: "No se pudo obtener la sesión del administrador.",
    }
  }

  const { error } = await supabase
    .from("technician_applications")
    .update({
      status: "under_review",
      reviewer_id: user.id,
      review_notes: null,
    })
    .eq("id", applicationId)

  if (error) {
    console.error("Error updating application to under_review", error)
    return {
      success: false,
      message: "No pudimos mover la postulación a revisión.",
    }
  }

  revalidatePath("/admin/technicians")
  revalidatePath(`/admin/technicians/${applicationId}`)

  return {
    success: true,
    message: "La postulación se marcó como 'Under Review'.",
  }
}

export async function submitApplicationDecisionAction({
  applicationId,
  decision,
  reviewNotes,
}: {
  applicationId: string
  decision: Decision
  reviewNotes?: string
}): Promise<DecisionResult> {
  const supabase = await createClient()

  const { data, error } = await supabase.functions.invoke("approveApplication", {
    body: {
      applicationId,
      decision,
      reviewNotes: reviewNotes?.trim() || undefined,
    },
  })

  if (error || !data || (data as { error?: unknown }).error) {
    console.error("Error invoking approveApplication function", error ?? (data as { error?: unknown }).error)
    return {
      success: false,
      message: "No pudimos procesar la decisión. Intenta nuevamente.",
    }
  }

  revalidatePath("/admin/technicians")
  revalidatePath(`/admin/technicians/${applicationId}`)

  return {
    success: true,
    message:
      decision === "approved"
        ? "La postulación fue aprobada exitosamente."
        : "La postulación fue rechazada exitosamente.",
  }
}

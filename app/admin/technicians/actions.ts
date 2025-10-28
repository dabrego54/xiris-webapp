"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import type { ApplicationStatus } from "@/types/database.types"

interface ActionResult {
  success: boolean
  error?: string
  status?: ApplicationStatus
}

export async function moveApplicationToUnderReview(
  applicationId: string
): Promise<ActionResult> {
  if (!applicationId) {
    return { success: false, error: "Falta el identificador de la postulación." }
  }

  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    console.error("No se pudo obtener el usuario administrador para mover la postulación.", userError)
    return {
      success: false,
      error: "No pudimos validar tu sesión de administrador.",
    }
  }

  const { error } = await supabase
    .from("technician_applications")
    .update({
      status: "under_review",
      reviewer_id: user.id,
      review_notes: null,
      reviewed_at: null,
    })
    .eq("id", applicationId)

  if (error) {
    console.error("Error al mover la postulación a revisión.", error)
    return {
      success: false,
      error: "No pudimos mover la postulación a revisión.",
    }
  }

  revalidatePath("/admin/technicians")
  revalidatePath(`/admin/technicians/${applicationId}`)

  return { success: true, status: "under_review" }
}

type Decision = "approved" | "rejected"

interface SubmitDecisionInput {
  applicationId: string
  decision: Decision
  reviewNotes: string
}

export async function submitApplicationDecision({
  applicationId,
  decision,
  reviewNotes,
}: SubmitDecisionInput): Promise<ActionResult> {
  if (!applicationId) {
    return { success: false, error: "Falta el identificador de la postulación." }
  }

  const trimmedNotes = reviewNotes.trim()

  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    console.error("No se pudo obtener el usuario administrador para aprobar o rechazar.", userError)
    return {
      success: false,
      error: "No pudimos validar tu sesión de administrador.",
    }
  }

  const { error } = await supabase.functions.invoke(
    "approveApplication",
    {
      body: {
        applicationId,
        decision,
        reviewNotes: trimmedNotes.length > 0 ? trimmedNotes : undefined,
      },
    }
  )

  if (error) {
    console.error("Error al invocar la función de aprobación de postulaciones.", error)
    return {
      success: false,
      error: "No pudimos registrar la decisión sobre la postulación.",
    }
  }

  revalidatePath("/admin/technicians")
  revalidatePath(`/admin/technicians/${applicationId}`)

  return {
    success: true,
    status: decision,
  }
}

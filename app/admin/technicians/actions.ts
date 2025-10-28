"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { FunctionsHttpError } from "@supabase/supabase-js"
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

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError || !session?.access_token || !session.user) {
    console.error("Error retrieving session before invoking approveApplication", sessionError)
    return {
      success: false,
      message: "No se pudo obtener la sesión del administrador.",
    }
  }

  const { data, error } = await supabase.functions.invoke("approveApplication", {
    body: {
      applicationId,
      decision,
      reviewNotes: reviewNotes?.trim() || undefined,
    },
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  })

  if (error || !data || (data as { error?: unknown }).error) {
    let message = "No pudimos procesar la decisión. Intenta nuevamente."

    if (error) {
      console.error("Error invoking approveApplication function", error)

      if (error instanceof FunctionsHttpError) {
        try {
          const details = (await error.context.json()) as { error?: string }

          if (details?.error) {
            const friendlyMessages: Record<string, string> = {
              "Application not found": "No encontramos la postulación solicitada.",
              "Reviewer is not authorized": "Tu cuenta no tiene permisos para aprobar postulaciones.",
              "Authentication failed": "No pudimos autenticar tu sesión. Vuelve a iniciar sesión e inténtalo otra vez.",
            }

            message =
              friendlyMessages[details.error] ??
              "No pudimos completar la acción: " + details.error
          }
        } catch (parseError) {
          console.error("Unable to parse approveApplication error response", parseError)
        }
      }
    } else {
      const dataError = (data as { error?: unknown } | null)?.error
      console.error("Error invoking approveApplication function", dataError)
    }

    return {
      success: false,
      message,
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

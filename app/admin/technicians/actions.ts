"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import type { SupabaseDatabase } from "@/lib/supabase/types"
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

  const updatePayload: SupabaseDatabase["public"]["Tables"]["technician_applications"]["Update"] = {
    status: "under_review",
    reviewer_id: user.id,
    review_notes: null,
  }

  const { error } = await supabase
    .from("technician_applications")
    .update(updatePayload)
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
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    console.error("Error retrieving authenticated user before invoking approveApplication", userError)
    return {
      success: false,
      message: "No se pudo obtener la sesión del administrador.",
    }
  }

  const {
    data: sessionData,
    error: sessionError,
  } = await supabase.auth.getSession()

  const accessToken = sessionData?.session?.access_token

  if (sessionError || !accessToken) {
    console.error("Error retrieving access token before invoking approveApplication", sessionError)
    return {
      success: false,
      message: "No se pudo autenticar la sesión del administrador.",
    }
  }

  const trimmedNotes = reviewNotes?.trim()

  type InvocationResponse = Awaited<ReturnType<typeof supabase.functions.invoke>>
  let invocationResponse: InvocationResponse

  try {
    invocationResponse = await supabase.functions.invoke(
      "approveApplication",
      {
        body: {
          applicationId,
          decision,
          reviewNotes: trimmedNotes ? trimmedNotes : undefined,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "x-reviewer-id": user.id,
        },
      },
    )
  } catch (networkError) {
    console.error("Network error invoking approveApplication", networkError)
    return {
      success: false,
      message: "No pudimos contactar el servicio de aprobación. Intenta nuevamente.",
    }
  }

  const { data: functionData, error: functionError } = invocationResponse

  if (functionError) {
    console.error("approveApplication responded with error", {
      status: functionError.status,
      message: functionError.message,
    })

    const defaultMessage = "No pudimos procesar la decisión. Intenta nuevamente."
    let message = defaultMessage

    const friendlyMessages: Record<string, string> = {
      "Application not found": "No encontramos la postulación solicitada.",
      "Reviewer is not authorized": "Tu cuenta no tiene permisos para aprobar postulaciones.",
      "Authentication failed": "No pudimos autenticar tu sesión. Vuelve a iniciar sesión e inténtalo otra vez.",
      "Failed to authenticate user": "No pudimos autenticar tu sesión. Vuelve a iniciar sesión e inténtalo otra vez.",
      "Missing or invalid Authorization header":
        "Tu sesión expiró o es inválida. Vuelve a iniciar sesión e inténtalo nuevamente.",
      "Missing access token": "Tu sesión expiró o es inválida. Vuelve a iniciar sesión e inténtalo nuevamente.",
      "Missing x-reviewer-id header for service invocation":
        "Falta información del revisor para completar la acción.",
      "Failed to fetch application": "No encontramos la postulación solicitada.",
      "Function not found":
        "No pudimos contactar el servicio de aprobación. Verifica la configuración del proyecto.",
    }

    const errorDetails =
      (functionData as { error?: string } | null | undefined)?.error ?? functionError.message

    if (functionError.status === 404) {
      message = friendlyMessages["Function not found"] ?? defaultMessage
    }

    if (errorDetails) {
      message = friendlyMessages[errorDetails] ?? `No pudimos completar la acción: ${errorDetails}`
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

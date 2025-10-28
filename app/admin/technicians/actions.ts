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
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError || !session?.access_token) {
    console.error("Error retrieving session before invoking approveApplication", sessionError)
    return {
      success: false,
      message: "No se pudo obtener la sesión del administrador.",
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Missing Supabase configuration for Edge Function invocation", {
      supabaseUrlPresent: Boolean(supabaseUrl),
      supabaseAnonKeyPresent: Boolean(supabaseAnonKey),
    })
    return {
      success: false,
      message: "Configuración inválida del proyecto. Contacta al equipo técnico.",
    }
  }

  let response: Response

  try {
    response = await fetch(`${supabaseUrl}/functions/v1/approveApplication`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${session.access_token}`,
        "x-reviewer-id": user.id,
      },
      body: JSON.stringify({
        applicationId,
        decision,
        reviewNotes: reviewNotes?.trim() || undefined,
      }),
    })
  } catch (invokeError) {
    console.error("Network error invoking approveApplication function", invokeError)
    let message = "No pudimos procesar la decisión. Intenta nuevamente."

    return {
      success: false,
      message,
    }
  }

  if (!response.ok) {
    let message = "No pudimos procesar la decisión. Intenta nuevamente."

    try {
      const details = (await response.json()) as { error?: string }

      if (details?.error) {
        const friendlyMessages: Record<string, string> = {
          "Application not found": "No encontramos la postulación solicitada.",
          "Reviewer is not authorized": "Tu cuenta no tiene permisos para aprobar postulaciones.",
          "Authentication failed": "No pudimos autenticar tu sesión. Vuelve a iniciar sesión e inténtalo otra vez.",
          "Failed to authenticate user": "No pudimos autenticar tu sesión. Vuelve a iniciar sesión e inténtalo otra vez.",
          "Missing or invalid Authorization header":
            "Tu sesión expiró o es inválida. Vuelve a iniciar sesión e inténtalo nuevamente.",
          "Function not found":
            "No pudimos contactar el servicio de aprobación. Verifica la configuración del proyecto.",
        }

        message =
          friendlyMessages[details.error] ??
          "No pudimos completar la acción: " + details.error
      }
    } catch (parseError) {
      console.error("Unable to parse approveApplication error response", parseError)
    }

    console.error("approveApplication responded with error", {
      status: response.status,
      statusText: response.statusText,
    })
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

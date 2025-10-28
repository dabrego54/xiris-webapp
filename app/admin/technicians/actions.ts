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

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!anonKey) {
    console.error("Missing Supabase anon key while invoking approveApplication")
    return {
      success: false,
      message: "No pudimos autenticar la solicitud. Falta configuración de Supabase.",
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
          apikey: anonKey,
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
      "Unable to retrieve application":
        "No pudimos obtener la postulación. Intenta nuevamente.",
      "Unable to verify reviewer profile":
        "No pudimos verificar tu perfil de administrador. Vuelve a intentarlo más tarde.",
      "Failed to update profile role":
        "No pudimos actualizar el rol del técnico. Intenta nuevamente.",
      "Failed to update user app metadata":
        "No pudimos actualizar la cuenta del técnico. Intenta nuevamente.",
      "Failed to update application":
        "No pudimos actualizar la postulación. Intenta nuevamente.",
      "Failed to invite applicant":
        "No pudimos invitar al postulante. Intenta nuevamente.",
      "Failed to insert audit log":
        "No pudimos registrar la auditoría de la decisión. Intenta nuevamente.",
      "Failed to process decision":
        "No pudimos procesar la decisión. Intenta nuevamente.",
      "Configuration error":
        "No pudimos contactar el servicio de aprobación. Falta configuración.",
      "Invalid request body":
        "Los datos enviados son inválidos. Verifica la información y vuelve a intentarlo.",
      "applicationId is required": "Falta el identificador de la postulación.",
      "decision must be 'approved' or 'rejected'":
        "La decisión enviada es inválida.",
      "reviewNotes must be a string": "Las notas de revisión deben ser texto.",
      "Function not found":
        "No pudimos contactar el servicio de aprobación. Verifica la configuración del proyecto.",
    }

    const contextResponse =
      typeof functionError === "object" && functionError !== null && "context" in functionError
        ? (functionError as { context?: Response }).context
        : undefined

    let status = contextResponse?.status
    let detailedError: string | undefined

    if (contextResponse) {
      const contentType = contextResponse.headers.get("content-type") ?? ""
      try {
        if (contentType.includes("application/json")) {
          const parsed = (await contextResponse.clone().json()) as { error?: string }
          detailedError = parsed?.error ?? undefined
        } else {
          const text = await contextResponse.clone().text()
          detailedError = text ? text.trim() : undefined
        }
      } catch (parseError) {
        console.error("Unable to parse approveApplication error response", parseError)
      }
    }

    const responseError =
      (functionData as { error?: string } | null | undefined)?.error ?? detailedError ?? undefined

    console.error("approveApplication responded with error", {
      status,
      message: functionError.message,
      details: responseError,
    })

    if (status === 404) {
      message = friendlyMessages["Function not found"] ?? defaultMessage
    }

    if (responseError) {
      message = friendlyMessages[responseError] ?? `No pudimos completar la acción: ${responseError}`
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

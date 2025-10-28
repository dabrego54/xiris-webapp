"use server"

import { revalidatePath } from "next/cache"

import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from "@supabase/supabase-js"

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

  const { error: functionError } = await supabase.functions.invoke<{ ok: boolean }>(
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

  if (functionError) {
    console.error("Error invoking approveApplication function", functionError)

    const defaultMessage = "No pudimos procesar la decisión. Intenta nuevamente."
    let message = defaultMessage

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

    if (functionError instanceof FunctionsHttpError) {
      const response = functionError.context?.response

      if (response?.status === 404) {
        message = friendlyMessages["Function not found"] ?? defaultMessage
      }

      if (response) {
        try {
          const contentType = response.headers.get("content-type") ?? ""
          if (contentType.includes("application/json")) {
            const details = (await response.clone().json()) as { error?: string }
            if (details?.error) {
              message =
                friendlyMessages[details.error] ?? `No pudimos completar la acción: ${details.error}`
            }
          }
        } catch (parseError) {
          console.error("Unable to parse approveApplication error response", parseError)
        }
      }
    } else if (functionError instanceof FunctionsRelayError) {
      message =
        friendlyMessages[functionError.message] ??
        "El servicio de aprobación no está disponible. Inténtalo nuevamente en unos minutos."
    } else if (functionError instanceof FunctionsFetchError) {
      message =
        friendlyMessages[functionError.message] ??
        "No pudimos contactar el servicio de aprobación. Revisa tu conexión e inténtalo otra vez."
    } else if (functionError.message) {
      message = friendlyMessages[functionError.message] ?? defaultMessage
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

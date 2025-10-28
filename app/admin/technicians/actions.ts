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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "")
  const configuredFunctionsUrl =
    process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL?.replace(/\/$/, "")
  const functionsBaseUrl = configuredFunctionsUrl ?? (supabaseUrl ? `${supabaseUrl}/functions/v1` : undefined)

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!functionsBaseUrl || !anonKey) {
    console.error("Missing Supabase function configuration", {
      hasFunctionsUrl: Boolean(functionsBaseUrl),
      hasAnonKey: Boolean(anonKey),
    })
    return {
      success: false,
      message: "No pudimos contactar el servicio de aprobación. Falta configuración.",
    }
  }

  const functionUrl = `${functionsBaseUrl.replace(/\/$/, "")}/approveApplication`
  const trimmedNotes = reviewNotes?.trim()

  let functionResponse: Response

  try {
    functionResponse = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
        "x-reviewer-id": user.id,
      },
      body: JSON.stringify({
        applicationId,
        decision,
        reviewNotes: trimmedNotes ? trimmedNotes : undefined,
      }),
      cache: "no-store",
    })
  } catch (networkError) {
    console.error("Network error invoking approveApplication", networkError)
    return {
      success: false,
      message: "No pudimos contactar el servicio de aprobación. Intenta nuevamente.",
    }
  }

  if (!functionResponse.ok) {
    console.error("approveApplication responded with error", {
      status: functionResponse.status,
      statusText: functionResponse.statusText,
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
      "Function not found":
        "No pudimos contactar el servicio de aprobación. Verifica la configuración del proyecto.",
    }

    if (functionResponse.status === 404) {
      message = friendlyMessages["Function not found"] ?? defaultMessage
    }

    const contentType = functionResponse.headers.get("content-type") ?? ""
    if (contentType.includes("application/json")) {
      try {
        const details = (await functionResponse.json()) as { error?: string }
        if (details?.error) {
          message = friendlyMessages[details.error] ?? `No pudimos completar la acción: ${details.error}`
        }
      } catch (parseError) {
        console.error("Unable to parse approveApplication error response", parseError)
      }
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

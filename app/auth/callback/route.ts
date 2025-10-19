import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import type { SupabaseClient } from "@supabase/supabase-js"

import { AUTH_REVALIDATE_PATHS } from "@/app/actions/auth.actions"
import { createClient } from "@/lib/supabase/server"
import type { SupabaseDatabase } from "@/lib/supabase/types"
import type { UserType } from "@/types/database.types"

type SupabaseServerClient = SupabaseClient<SupabaseDatabase>

function resolveRedirect(requestUrl: URL, redirectTo?: string | null): string {
  if (!redirectTo) {
    return new URL("/dashboard", requestUrl.origin).toString()
  }

  try {
    const targetUrl = new URL(redirectTo, requestUrl.origin)

    if (targetUrl.origin !== requestUrl.origin) {
      return new URL("/dashboard", requestUrl.origin).toString()
    }

    return targetUrl.toString()
  } catch (error) {
    console.error("Redirección inválida recibida en el callback de OAuth.", error)
    return new URL("/dashboard", requestUrl.origin).toString()
  }
}

function getFallbackRoute(flow: string | null): string {
  if (flow === "login") {
    return "/login"
  }

  if (flow === "register") {
    return "/registro"
  }

  return "/login"
}

async function ensureProfileForUser(
  supabase: SupabaseServerClient,
  userType: UserType | null
): Promise<void> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    console.error("No se pudo recuperar al usuario tras el intercambio de código.", userError)
    return
  }

  if (!user) {
    return
  }

  if (userType) {
    const metadata = {
      ...user.user_metadata,
      user_type: userType,
    }

    const { error: metadataError } = await supabase.auth.updateUser({ data: metadata })

    if (metadataError) {
      console.error("No se pudo actualizar el metadata del usuario tras el login social.", metadataError)
    }

    const profilePayload = {
      id: user.id,
      email: user.email ?? "",
      user_type: userType,
      full_name: (metadata.full_name ?? metadata.name ?? null) as string | null,
      phone: (metadata.phone ?? null) as string | null,
      status: (metadata.status as string | undefined) ?? "active",
      updated_at: new Date().toISOString(),
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .upsert(profilePayload, { onConflict: "id" })

    if (profileError) {
      console.error("No se pudo crear o actualizar el perfil después del login social.", profileError)
    }

    if (userType === "tecnico") {
      const { error: technicianError } = await supabase
        .from("technician_profiles")
        .upsert({ id: user.id }, { onConflict: "id" })

      if (technicianError) {
        console.error("No se pudo inicializar el perfil de técnico tras la autenticación.", technicianError)
      }
    } else {
      const { error: clientError } = await supabase
        .from("client_profiles")
        .upsert({ id: user.id }, { onConflict: "id" })

      if (clientError) {
        console.error("No se pudo inicializar el perfil de cliente tras la autenticación.", clientError)
      }
    }
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const flow = requestUrl.searchParams.get("flow")
  const redirectTo = requestUrl.searchParams.get("redirect_to")
  const userTypeRaw = requestUrl.searchParams.get("user_type")
  const userTypeParam =
    userTypeRaw === "cliente" || userTypeRaw === "tecnico" ? (userTypeRaw as UserType) : null
  const errorDescription =
    requestUrl.searchParams.get("error_description") ?? requestUrl.searchParams.get("error")

  if (errorDescription) {
    const fallback = new URL(`${getFallbackRoute(flow)}?error=oauth`, requestUrl.origin)
    return NextResponse.redirect(fallback)
  }

  if (!code) {
    const fallback = new URL(`${getFallbackRoute(flow)}?error=missing_code`, requestUrl.origin)
    return NextResponse.redirect(fallback)
  }

  const supabase = createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error("No se pudo intercambiar el código de OAuth por una sesión.", error)
    const fallback = new URL(`${getFallbackRoute(flow)}?error=session`, requestUrl.origin)
    return NextResponse.redirect(fallback)
  }

  await ensureProfileForUser(supabase, userTypeParam)

  for (const path of AUTH_REVALIDATE_PATHS) {
    revalidatePath(path)
  }

  const destination = resolveRedirect(requestUrl, redirectTo)

  return NextResponse.redirect(destination)
}

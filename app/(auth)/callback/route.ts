import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

function resolveRedirectUrl(requestUrl: URL, nextParam: string | null): string {
  const defaultRedirect = new URL("/dashboard", requestUrl.origin)

  if (!nextParam) {
    return defaultRedirect.toString()
  }

  try {
    const targetUrl = new URL(nextParam, requestUrl.origin)

    if (targetUrl.origin !== requestUrl.origin) {
      console.warn(
        "Intento de redirección a un origen diferente bloqueado en el callback de OAuth.",
        nextParam
      )
      return defaultRedirect.toString()
    }

    return targetUrl.toString()
  } catch (error) {
    console.error("URL de redirección inválida recibida en el callback de OAuth.", error)
    return defaultRedirect.toString()
  }
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const nextParam = requestUrl.searchParams.get("next")

  if (!code) {
    console.error("El callback de OAuth fue invocado sin un código de autorización válido.")
    const errorUrl = new URL("/auth/error", requestUrl.origin)
    errorUrl.searchParams.set("message", "missing_code")
    return NextResponse.redirect(errorUrl)
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
      console.error("Supabase devolvió un error al intercambiar el código de OAuth.", error)
      const errorUrl = new URL("/auth/error", requestUrl.origin)
      errorUrl.searchParams.set("message", error.message)
      return NextResponse.redirect(errorUrl)
    }

    const destination = resolveRedirectUrl(requestUrl, nextParam)

    return NextResponse.redirect(destination)
  } catch (error) {
    console.error("Error inesperado durante el callback de OAuth de Supabase.", error)
    const errorUrl = new URL("/auth/error", requestUrl.origin)
    const message = error instanceof Error ? error.message : "unknown_error"
    errorUrl.searchParams.set("message", message)
    return NextResponse.redirect(errorUrl)
  }
}

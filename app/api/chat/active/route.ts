import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

const ACTIVE_CHAT_STATUSES = ["candidate_ready", "accepted", "on_route", "in_progress"] as const

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError) {
      console.error("No se pudo validar la sesión.", authError)
      return NextResponse.json({ error: "No autorizado." }, { status: 401 })
    }

    if (!user) {
      return NextResponse.json({ serviceRequestId: null }, { status: 200 })
    }

    const isTechnician = user.user_metadata?.user_type === "tecnico"

    const { data: serviceRequest, error: serviceError } = await supabase
      .from("service_requests")
      .select("id")
      .eq(isTechnician ? "assigned_technician_id" : "client_id", user.id)
      .not("assigned_technician_id", "is", null)
      .in("status", ACTIVE_CHAT_STATUSES)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (serviceError) {
      console.error("No se pudo obtener el servicio activo para el chat.", serviceError)
      return NextResponse.json({ error: "No se pudo cargar el chat." }, { status: 500 })
    }

    return NextResponse.json({ serviceRequestId: serviceRequest?.id ?? null })
  } catch (error) {
    console.error("Error inesperado al obtener el chat activo.", error)
    return NextResponse.json({ error: "Error inesperado." }, { status: 500 })
  }
}

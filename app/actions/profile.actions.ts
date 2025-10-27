"use server"

import { z } from "zod"

import { createClient } from "@/lib/supabase/server"

const ensureProfileContactInfoSchema = z.object({
  fullName: z.string().min(1),
  phone: z.string().optional().nullable(),
})

type EnsureProfileContactInfoInput = z.infer<typeof ensureProfileContactInfoSchema>

type EnsureProfileContactInfoResult = {
  success: boolean
  error?: string
}

export async function ensureProfileContactInfo(
  input: EnsureProfileContactInfoInput
): Promise<EnsureProfileContactInfoResult> {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    console.error("No se pudo obtener el usuario autenticado al asegurar el perfil.", userError)
    return { success: false, error: "No se pudo recuperar la sesión actual." }
  }

  if (!user) {
    return { success: false, error: "No hay un usuario autenticado." }
  }

  const { fullName, phone } = ensureProfileContactInfoSchema.parse(input)
  const trimmedName = fullName.trim()
  const sanitizedPhone = phone?.trim() ?? null
  const trimmedPhone = sanitizedPhone && sanitizedPhone.length > 0 ? sanitizedPhone : null

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, phone")
    .eq("id", user.id)
    .maybeSingle<{
      id: string
      full_name: string | null
      phone: string | null
    }>()

  if (profileError) {
    console.error("No se pudo obtener el perfil existente al asegurar la información de contacto.", profileError)
    return { success: false, error: "No se pudo guardar la información del perfil." }
  }

  const updates: { full_name?: string | null; phone?: string | null } = {}

  if (!profile || !profile.full_name) {
    updates.full_name = trimmedName
  }

  if (trimmedPhone && (!profile || !profile.phone)) {
    updates.phone = trimmedPhone
  }

  if (!profile) {
    const payload = {
      id: user.id,
      full_name: updates.full_name ?? trimmedName,
      phone: updates.phone ?? trimmedPhone,
    }

    const { error: insertError } = await supabase
      .from("profiles")
      .insert(payload)

    if (insertError) {
      console.error("No se pudo crear el perfil al asegurar la información de contacto.", insertError)
      return { success: false, error: "No se pudo guardar la información del perfil." }
    }

    return { success: true }
  }

  if (Object.keys(updates).length === 0) {
    return { success: true }
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id)

  if (updateError) {
    console.error("No se pudo actualizar el perfil al asegurar la información de contacto.", updateError)
    return { success: false, error: "No se pudo guardar la información del perfil." }
  }

  return { success: true }
}

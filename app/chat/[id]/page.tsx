import { notFound, redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"

import ChatPageClient from "./chat-page-client"

type ChatPageProps = {
  params: Promise<{ id: string }> | { id: string }
}

export default async function ChatPage({ params }: ChatPageProps) {
  const resolvedParams = params instanceof Promise ? await params : params
  const serviceRequestId = resolvedParams.id

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?next=/chat/${serviceRequestId}`)
  }

  const { data: serviceRequest } = await supabase
    .from("service_requests")
    .select("id, client_id, assigned_technician_id")
    .eq("id", serviceRequestId)
    .maybeSingle()

  if (!serviceRequest) {
    notFound()
  }

  const isParticipant =
    user.id === serviceRequest.client_id || user.id === serviceRequest.assigned_technician_id

  if (!isParticipant) {
    notFound()
  }

  const counterpartId =
    user.id === serviceRequest.client_id ? serviceRequest.assigned_technician_id : serviceRequest.client_id

  const { data: counterpartProfile } = counterpartId
    ? await supabase
        .from("profiles")
        .select("id, full_name, email, user_type, avatar_url")
        .eq("id", counterpartId)
        .maybeSingle()
    : { data: null }

  const viewerRole = user.user_metadata?.user_type === "tecnico" ? "technician" : "user"

  return (
    <ChatPageClient
      serviceRequestId={serviceRequest.id}
      counterpart={
        counterpartProfile
          ? {
              id: counterpartProfile.id,
              name: counterpartProfile.full_name ?? counterpartProfile.email,
              avatar: counterpartProfile.avatar_url ?? undefined,
              role: counterpartProfile.user_type === "tecnico" ? "technician" : "user",
            }
          : null
      }
      viewerRole={viewerRole}
    />
  )
}

import { notFound } from "next/navigation"

import techniciansData from "@/data/technicians.json"

import ChatPageClient from "./chat-page-client"

type ChatPageProps = {
  params: Promise<{ id: string }>
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { id } = await params
  const technician = techniciansData.find((t) => t.id === id)

  if (!technician) {
    notFound()
  }

  return <ChatPageClient technician={technician} />
}

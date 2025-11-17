"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import AppShell from "@/components/AppShell"
import ChatBubble from "@/components/ChatBubble"
import ChatInput from "@/components/ChatInput"

export type ChatPageTechnician = {
  id: string
  name: string
  specialty: string
  avatar?: string
}

type Message = {
  id: string
  text: string
  sender: "user" | "technician"
  timestamp: string
  read: boolean
}

type ChatPageClientProps = {
  technician: ChatPageTechnician
}

export default function ChatPageClient({ technician }: ChatPageClientProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hola, Juan voy en camino, llego en 5 minutos.",
      sender: "technician",
      timestamp: "19:25",
      read: true,
    },
    {
      id: "2",
      text: "Genial, te espero en recepción",
      sender: "user",
      timestamp: "19:27",
      read: true,
    },
  ])

  const handleSendMessage = (text: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      sender: "user",
      timestamp: new Date().toLocaleTimeString("es-CL", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      read: false,
    }
    setMessages((prev) => [...prev, newMessage])
  }

  return (
    <AppShell hideNav>
      <div className="flex h-full flex-col bg-purple-50">
        <div className="flex items-center gap-3 border-b border-purple-100 bg-white px-4 py-3">
          <Link href={`/servicio/${technician.id}`} className="rounded-full p-2 hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </Link>
          <img src={technician.avatar || "/placeholder.svg"} alt={technician.name} className="h-10 w-10 rounded-full" />
          <div className="flex-1">
            <h2 className="font-semibold text-gray-900">{technician.name}</h2>
            <p className="text-sm text-gray-500">{technician.specialty}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <ChatBubble
                key={message.id}
                text={message.text}
                sender={message.sender}
                timestamp={message.timestamp}
                read={message.read}
              />
            ))}
          </div>
        </div>

        <div className="border-t border-purple-100 bg-white p-4">
          <ChatInput onSend={handleSendMessage} />
        </div>
      </div>
    </AppShell>
  )
}

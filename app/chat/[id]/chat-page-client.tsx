"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import AppShell from "@/components/AppShell"
import ChatBubble from "@/components/ChatBubble"
import ChatInput from "@/components/ChatInput"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

type Message = {
  id: string
  text: string
  sender: "user" | "technician"
  timestamp: string
  read: boolean
  authorId?: string
}

type ChatParticipant = {
  id: string
  name: string
  avatar?: string
  role: "user" | "technician"
}

type ChatPageClientProps = {
  serviceRequestId: string
  counterpart: ChatParticipant | null
  viewerRole: Message["sender"]
}

export default function ChatPageClient({ serviceRequestId, counterpart, viewerRole }: ChatPageClientProps) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const chatChannel = useMemo(() => supabase.channel(`chat-${serviceRequestId}`), [serviceRequestId, supabase])
  const [messages, setMessages] = useState<Message[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [participantRole, setParticipantRole] = useState<Message["sender"]>(viewerRole)
  const currentUserIdRef = useRef<string | null>(null)

  useEffect(() => {
    const getSessionAndRole = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const userId = session?.user.id ?? null
      const userType = (session?.user.user_metadata?.user_type as string | undefined) ?? "cliente"
      const derivedRole = userType === "tecnico" ? "technician" : "user"

      setCurrentUserId(userId)
      currentUserIdRef.current = userId
      setParticipantRole(derivedRole)
    }

    void getSessionAndRole()

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const userId = session?.user?.id ?? null
      const userType = (session?.user?.user_metadata?.user_type as string | undefined) ?? "cliente"
      const derivedRole = userType === "tecnico" ? "technician" : "user"

      setCurrentUserId(userId)
      currentUserIdRef.current = userId
      setParticipantRole(derivedRole)
    })

    return () => {
      authListener?.subscription.unsubscribe()
    }
  }, [supabase])

  useEffect(() => {
    const subscription = chatChannel.on(
      "broadcast",
      { event: "message" },
      ({ payload }) => {
        const incoming = payload as Message

        if (incoming.authorId && incoming.authorId === currentUserIdRef.current) {
          return
        }

        setMessages((prev) => {
          const alreadyExists = prev.some((message) => message.id === incoming.id)
          if (alreadyExists) return prev
          return [...prev, incoming]
        })
      }
    )

    void chatChannel.subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [chatChannel, supabase])

  const handleSendMessage = (text: string) => {
    const newMessage: Message = {
      id: crypto.randomUUID(),
      text,
      sender: participantRole,
      timestamp: new Date().toLocaleTimeString("es-CL", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      read: true,
      authorId: currentUserId ?? "anon",
    }

    setMessages((prev) => [...prev, newMessage])

    void chatChannel.send({
      type: "broadcast",
      event: "message",
      payload: { ...newMessage, read: false },
    })
  }

  return (
    <AppShell hideNav>
      <div className="flex h-full flex-col bg-purple-50">
        <div className="flex items-center gap-3 border-b border-purple-100 bg-white px-4 py-3">
          <Link
            href={participantRole === "technician" ? `/tech/service/${serviceRequestId}` : `/client/service/${serviceRequestId}`}
            className="rounded-full p-2 hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </Link>
          <img src={counterpart?.avatar || "/placeholder.svg"} alt={counterpart?.name ?? "Participante"} className="h-10 w-10 rounded-full" />
          <div className="flex-1">
            <h2 className="font-semibold text-gray-900">{counterpart?.name ?? "Chat del servicio"}</h2>
            <p className="text-sm text-gray-500">
              {counterpart ? (counterpart.role === "technician" ? "Técnico asignado" : "Cliente") : "Esperando participante"}
            </p>
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

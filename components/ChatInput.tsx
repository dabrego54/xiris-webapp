"use client"

import type React from "react"

import { useState } from "react"
import { Mic, Send } from "lucide-react"

type ChatInputProps = {
  onSend: (message: string) => void
}

export default function ChatInput({ onSend }: ChatInputProps) {
  const [message, setMessage] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim()) {
      onSend(message)
      setMessage("")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <div className="flex flex-1 items-center gap-2 rounded-full bg-purple-50 px-4 py-3">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Escribe aquí tu mensaje"
          className="flex-1 bg-transparent text-gray-900 placeholder-gray-400 outline-none"
        />
        <button type="button" className="text-purple-600 hover:text-purple-700" aria-label="Mensaje de voz">
          <Mic className="h-5 w-5" />
        </button>
      </div>
      <button
        type="submit"
        disabled={!message.trim()}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-600 text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
        aria-label="Enviar mensaje"
      >
        <Send className="h-5 w-5" />
      </button>
    </form>
  )
}

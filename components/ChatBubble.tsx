import { Check, CheckCheck } from "lucide-react"

type ChatBubbleProps = {
  text: string
  sender: "user" | "technician"
  timestamp: string
  read: boolean
}

export default function ChatBubble({ text, sender, timestamp, read }: ChatBubbleProps) {
  const isUser = sender === "user"

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser ? "rounded-br-sm bg-purple-600 text-white" : "rounded-bl-sm bg-white text-gray-900"
        }`}
      >
        <p className="leading-relaxed">{text}</p>
        <div
          className={`mt-1 flex items-center justify-end gap-1 text-xs ${isUser ? "text-purple-200" : "text-gray-500"}`}
        >
          <span>{timestamp}</span>
          {isUser && <span>{read ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />}</span>}
        </div>
      </div>
    </div>
  )
}

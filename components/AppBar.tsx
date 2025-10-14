"use client"

import { ArrowLeft, Bell } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"

export default function AppBar() {
  const router = useRouter()
  const pathname = usePathname()
  const showBack = pathname !== "/"

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4">
      <div className="w-10">
        {showBack && (
          <button onClick={() => router.back()} className="rounded-full p-2 hover:bg-gray-100" aria-label="Volver">
            <ArrowLeft className="h-5 w-5 text-purple-600" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-1">
        <span className="text-2xl font-bold text-purple-600">X</span>
        <span className="text-2xl font-light text-gray-700">iris</span>
      </div>

      <button
        onClick={() => router.push("/notificaciones")}
        className="rounded-full p-2 hover:bg-gray-100"
        aria-label="Notificaciones"
      >
        <Bell className="h-5 w-5 text-purple-600" />
      </button>
    </header>
  )
}

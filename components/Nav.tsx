"use client"

import { Home, Briefcase, Search, MessageCircle, User } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

type NavProps = {
  variant: "bottom" | "sidebar"
}

const navItems = [
  { icon: Home, label: "Inicio", href: "/dashboard" },
  { icon: Briefcase, label: "Servicios", href: "/servicios" },
  { icon: Search, label: "Buscar", href: "/tecnicos" },
  { icon: MessageCircle, label: "Chat", href: "/chat/1" },
  { icon: User, label: "Perfil", href: "/perfil" },
]

export default function Nav({ variant }: NavProps) {
  const pathname = usePathname()

  if (variant === "bottom") {
    return (
      <nav className="flex h-16 items-center justify-around border-t border-purple-200 bg-purple-600 px-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-1 rounded-lg px-3 py-2 transition-colors ${
                isActive ? "text-white" : "text-purple-200 hover:text-white"
              }`}
            >
              <Icon className="h-6 w-6" />
              <span className="sr-only">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    )
  }

  return (
    <nav className="flex flex-col items-center gap-2 py-4">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`group relative flex h-12 w-12 items-center justify-center rounded-xl transition-colors ${
              isActive ? "bg-purple-100 text-purple-600" : "text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            }`}
            title={item.label}
          >
            <Icon className="h-6 w-6" />
            <span className="absolute left-full ml-2 hidden whitespace-nowrap rounded-lg bg-gray-900 px-2 py-1 text-xs text-white group-hover:block">
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}

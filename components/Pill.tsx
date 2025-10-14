import type { ReactNode } from "react"

type PillProps = {
  children: ReactNode
  variant?: "default" | "success" | "warning"
}

export default function Pill({ children, variant = "default" }: PillProps) {
  const colors = {
    default: "bg-purple-100 text-purple-700",
    success: "bg-green-100 text-green-700",
    warning: "bg-yellow-100 text-yellow-700",
  }

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${colors[variant]}`}>
      {children}
    </span>
  )
}

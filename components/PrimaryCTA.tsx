"use client"

import Link from "next/link"
import type { ReactNode } from "react"

type PrimaryCTAProps = {
  children: ReactNode
  href?: string
  onClick?: () => void
  disabled?: boolean
  type?: "button" | "submit"
}

export default function PrimaryCTA({ children, href, onClick, disabled, type = "button" }: PrimaryCTAProps) {
  const baseClasses =
    "block w-full rounded-2xl bg-purple-600 px-8 py-4 text-center font-semibold text-white shadow-lg shadow-purple-600/30 transition-all"
  const className = `${baseClasses} ${
    disabled
      ? "cursor-not-allowed opacity-60"
      : "hover:bg-purple-700 hover:shadow-xl hover:shadow-purple-600/40"
  }`

  if (href) {
    return (
      <Link href={href} className={className} aria-disabled={disabled}>
        {children}
      </Link>
    )
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  )
}

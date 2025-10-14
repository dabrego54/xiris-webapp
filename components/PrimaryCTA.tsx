"use client"

import Link from "next/link"
import type { ReactNode } from "react"

type PrimaryCTAProps = {
  children: ReactNode
  href?: string
  onClick?: () => void
}

export default function PrimaryCTA({ children, href, onClick }: PrimaryCTAProps) {
  const className =
    "block w-full rounded-2xl bg-purple-600 px-8 py-4 text-center font-semibold text-white shadow-lg shadow-purple-600/30 transition-all hover:bg-purple-700 hover:shadow-xl hover:shadow-purple-600/40"

  if (href) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    )
  }

  return (
    <button onClick={onClick} className={className}>
      {children}
    </button>
  )
}

import type React from "react"
import { Toaster } from "sonner"
import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Xiris - Uber de Técnicos",
  description: "Encuentra técnicos especializados cerca de ti",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es-CL">
      <body className="antialiased bg-white">
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  )
}

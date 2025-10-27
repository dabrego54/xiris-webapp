import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Panel de Técnicos | Xiris",
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Panel Administrador</h1>
            <p className="text-sm text-slate-500">
              Gestiona las postulaciones de técnicos en la plataforma
            </p>
          </div>
          <Link href="/" className="text-sm font-medium text-[#7C3AED] hover:underline">
            Volver al inicio
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  )
}

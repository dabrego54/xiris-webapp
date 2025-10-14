import AppShell from "@/components/AppShell"
import { Bell } from "lucide-react"

export default function NotificacionesPage() {
  return (
    <AppShell>
      <div className="flex h-full items-center justify-center bg-white">
        <div className="text-center">
          <Bell className="mx-auto mb-4 h-16 w-16 text-purple-300" />
          <h2 className="mb-2 text-xl font-bold text-gray-900">Sin notificaciones</h2>
          <p className="text-gray-500">No tienes notificaciones en este momento</p>
        </div>
      </div>
    </AppShell>
  )
}

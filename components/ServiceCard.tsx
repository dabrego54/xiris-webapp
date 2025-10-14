import { Monitor, Code, Server, Database } from "lucide-react"

type ServiceCardProps = {
  name: string
  icon: string
  color: string
}

const iconMap = {
  microsoft: Monitor,
  monitor: Monitor,
  code: Code,
  server: Server,
  database: Database,
}

export default function ServiceCard({ name, icon, color }: ServiceCardProps) {
  const Icon = iconMap[icon as keyof typeof iconMap] || Monitor

  return (
    <div className={`flex items-center gap-4 rounded-2xl ${color} p-4 transition-transform hover:scale-105`}>
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/80">
        <Icon className="h-6 w-6 text-purple-600" />
      </div>
      <span className="font-semibold text-gray-900">{name}</span>
    </div>
  )
}

import TechnicianCard from "./TechnicianCard"
import PrimaryCTA from "./PrimaryCTA"

type Technician = {
  id: string
  name: string
  avatar: string
  rating: number
  specialty: string
  distance: string
}

type TechnicianListPanelProps = {
  technicians: Technician[]
}

export default function TechnicianListPanel({ technicians }: TechnicianListPanelProps) {
  return (
    <div className="h-full bg-purple-50 p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">{technicians.length} Técnicos en tu Área</h2>
      </div>

      <div className="space-y-4">
        {technicians.map((tech) => (
          <TechnicianCard key={tech.id} {...tech} />
        ))}
      </div>

      <div className="mt-6">
        <PrimaryCTA href="/servicio/1">Seleccionar Automáticamente</PrimaryCTA>
      </div>
    </div>
  )
}

import Link from "next/link"
import RatingStars from "./RatingStars"
import { MapPin } from "lucide-react"

type TechnicianCardProps = {
  id: string
  name: string
  avatar: string
  rating: number
  specialty: string
  distance: string
}

export default function TechnicianCard({ id, name, avatar, rating, specialty, distance }: TechnicianCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm">
      <img
        src={avatar || "/placeholder.svg"}
        alt={name}
        className="h-16 w-16 rounded-full object-cover ring-2 ring-purple-100"
      />

      <div className="flex-1">
        <h3 className="font-bold text-gray-900">{name}</h3>
        <RatingStars rating={rating} />
        <p className="text-sm text-gray-600">{specialty}</p>
        <div className="mt-1 flex items-center gap-1 text-xs text-gray-500">
          <MapPin className="h-3 w-3" />
          <span>{distance}</span>
        </div>
      </div>

      <Link
        href={`/tecnicos/${id}`}
        className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-700"
      >
        Ver Perfil
      </Link>
    </div>
  )
}

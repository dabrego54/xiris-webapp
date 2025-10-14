import RatingStars from "./RatingStars"

type MiniTechnicianCardProps = {
  name: string
  specialty: string
  rating: number
  avatar: string
}

export default function MiniTechnicianCard({ name, specialty, rating, avatar }: MiniTechnicianCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-purple-50 p-4">
      <img
        src={avatar || "/placeholder.svg"}
        alt={name}
        className="h-14 w-14 rounded-full object-cover ring-2 ring-purple-200"
      />
      <div className="flex-1">
        <h3 className="font-bold text-gray-900">{name}</h3>
        <RatingStars rating={rating} />
        <p className="text-sm text-gray-600">{specialty}</p>
      </div>
    </div>
  )
}

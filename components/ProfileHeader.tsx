import RatingStars from "./RatingStars"

type ProfileHeaderProps = {
  name: string
  username: string
  city: string
  avatar: string
  coverImage: string
  rating: number
  totalServices: number
}

export default function ProfileHeader({
  name,
  username,
  city,
  avatar,
  coverImage,
  rating,
  totalServices,
}: ProfileHeaderProps) {
  return (
    <div className="relative">
      {/* Cover Image */}
      <div className="h-40 w-full overflow-hidden">
        <img src={coverImage || "/placeholder.svg"} alt="Cover" className="h-full w-full object-cover" />
      </div>

      {/* Avatar overlapping cover */}
      <div className="absolute left-1/2 top-32 -translate-x-1/2">
        <div className="rounded-full bg-white p-1 ring-4 ring-white">
          <img
            src={avatar || "/placeholder.svg"}
            alt={name}
            className="h-24 w-24 rounded-full object-cover ring-4 ring-purple-200"
          />
        </div>
      </div>

      {/* Profile Info */}
      <div className="mt-16 px-6 pb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900">{name}</h1>
        <p className="text-sm text-gray-500">
          @{username} · {city}
        </p>

        <div className="mt-4 flex items-center justify-center gap-6">
          <div>
            <div className="text-2xl font-bold text-gray-900">{totalServices}</div>
            <div className="text-sm text-gray-500">Atenciones</div>
          </div>
          <div className="h-12 w-px bg-gray-200" />
          <div>
            <RatingStars rating={rating} size="lg" />
          </div>
        </div>
      </div>
    </div>
  )
}

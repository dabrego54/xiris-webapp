import { Star } from "lucide-react"

type RatingStarsProps = {
  rating: number
  size?: "sm" | "lg"
}

export default function RatingStars({ rating, size = "sm" }: RatingStarsProps) {
  const starSize = size === "lg" ? "h-5 w-5" : "h-4 w-4"
  const textSize = size === "lg" ? "text-lg" : "text-sm"

  return (
    <div className="flex items-center gap-1">
      <Star className={`${starSize} fill-yellow-400 text-yellow-400`} />
      <span className={`${textSize} font-bold text-gray-900`}>{rating.toFixed(1)}</span>
      <span className={`${textSize} text-yellow-500`}>★</span>
    </div>
  )
}

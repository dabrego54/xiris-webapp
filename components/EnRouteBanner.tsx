import { Clock } from "lucide-react"

type EnRouteBannerProps = {
  eta: string
}

export default function EnRouteBanner({ eta }: EnRouteBannerProps) {
  return (
    <div className="rounded-2xl bg-purple-600 p-4 text-white shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
            <Clock className="h-5 w-5" />
          </div>
          <span className="font-semibold">Tu técnico está en ruta</span>
        </div>
        <div className="text-right">
          <div className="text-xs opacity-80">ETA</div>
          <div className="text-lg font-bold">{eta}</div>
        </div>
      </div>
    </div>
  )
}

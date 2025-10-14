type SkillBarProps = {
  name: string
  level: number
}

export default function SkillBar({ name, level }: SkillBarProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-24 text-sm font-semibold text-gray-700">{name}</div>
      <div className="flex-1">
        <div className="h-3 overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-orange-500 to-orange-600"
            style={{ width: `${level}%` }}
          />
        </div>
      </div>
    </div>
  )
}

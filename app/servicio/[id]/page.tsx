import AppShell from "@/components/AppShell"
import MapViewport from "@/components/MapViewport"
import EnRouteBanner from "@/components/EnRouteBanner"
import MiniTechnicianCard from "@/components/MiniTechnicianCard"
import PrimaryCTA from "@/components/PrimaryCTA"
import techniciansData from "@/data/technicians.json"
import { notFound } from "next/navigation"
import Link from "next/link"

export default function ServicioPage({
  params,
}: {
  params: { id: string }
}) {
  const technician = techniciansData.find((t) => t.id === params.id)

  if (!technician) {
    notFound()
  }

  return (
    <AppShell>
      <div className="flex h-full flex-col lg:flex-row">
        {/* Map with route */}
        <div className="h-[50vh] lg:h-full lg:w-[65%]">
          <MapViewport showRoute eta={technician.eta} />
        </div>

        {/* Service Status Panel */}
        <div className="flex-1 overflow-y-auto bg-white lg:w-[35%]">
          <div className="p-6">
            <EnRouteBanner eta="15 MINS" />

            <div className="mt-6">
              <MiniTechnicianCard
                name={technician.name}
                specialty={technician.specialty}
                rating={technician.rating}
                avatar={technician.avatar}
              />
            </div>

            <div className="mt-6 space-y-3">
              <Link
                href={`/tecnicos/${technician.id}`}
                className="block w-full rounded-2xl border-2 border-purple-600 bg-white px-6 py-3 text-center font-semibold text-purple-600 transition-colors hover:bg-purple-50"
              >
                Ver Perfil
              </Link>

              <PrimaryCTA href={`/chat/${technician.id}`}>Comunícate con tu Técnico</PrimaryCTA>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

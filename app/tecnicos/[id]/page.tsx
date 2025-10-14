import AppShell from "@/components/AppShell"
import MapViewport from "@/components/MapViewport"
import ProfileHeader from "@/components/ProfileHeader"
import SkillBar from "@/components/SkillBar"
import ServiceCard from "@/components/ServiceCard"
import PrimaryCTA from "@/components/PrimaryCTA"
import techniciansData from "@/data/technicians.json"
import { notFound } from "next/navigation"

export default function TechnicianProfilePage({
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
        {/* Map - hidden on mobile, visible on desktop */}
        <div className="hidden lg:block lg:w-[65%]">
          <MapViewport showTechnicians />
        </div>

        {/* Profile Panel */}
        <div className="flex-1 overflow-y-auto bg-white lg:w-[35%]">
          <ProfileHeader
            name={technician.name}
            username={technician.username}
            city={technician.city}
            avatar={technician.avatar}
            coverImage={technician.coverImage}
            rating={technician.rating}
            totalServices={technician.totalServices}
          />

          <div className="space-y-6 p-6">
            {/* About Section */}
            <section>
              <h2 className="mb-3 text-lg font-bold text-gray-900">Sobre Mi</h2>
              <p className="leading-relaxed text-gray-600">{technician.about}</p>
            </section>

            {/* Skills Section */}
            <section>
              <h2 className="mb-4 text-lg font-bold text-gray-900">Mis Habilidades</h2>
              <div className="space-y-3">
                {technician.skills.map((skill) => (
                  <SkillBar key={skill.name} name={skill.name} level={skill.level} />
                ))}
              </div>
            </section>

            {/* Services Section */}
            <section>
              <h2 className="mb-4 text-lg font-bold text-gray-900">Mis Servicios</h2>
              <div className="space-y-3">
                {technician.services.map((service) => (
                  <ServiceCard key={service.id} name={service.name} icon={service.icon} color={service.color} />
                ))}
              </div>
            </section>

            {/* CTA */}
            <div className="pt-4">
              <PrimaryCTA href={`/servicio/${technician.id}`}>Solicitar Servicio</PrimaryCTA>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}

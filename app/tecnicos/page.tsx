import AppShell from "@/components/AppShell"
import MapViewportWithFloatingControls from "@/components/MapViewportWithFloatingControls"
import TechnicianListPanel from "@/components/TechnicianListPanel"
import techniciansData from "@/data/technicians.json"

export default function TecnicosPage() {
  return (
    <AppShell>
      <div className="flex h-full flex-col lg:flex-row">
        {/* Map - hidden on mobile, visible on desktop */}
        <div className="hidden lg:block lg:w-[65%]">
          <MapViewportWithFloatingControls
            showTechnicians
            ctaHref="/tecnicos"
            ctaLabel="Buscando Técnicos Cercanos"
          />
        </div>

        {/* Technician List Panel */}
        <div className="flex-1 overflow-y-auto lg:w-[35%]">
          <TechnicianListPanel technicians={techniciansData} />
        </div>
      </div>
    </AppShell>
  )
}

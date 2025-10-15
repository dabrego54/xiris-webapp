import AppShell from "@/components/AppShell"
import MapViewportWithFloatingControls from "@/components/MapViewportWithFloatingControls"

export default function HomePage() {
  return (
    <AppShell>
      <div className="relative h-full w-full">
        <MapViewportWithFloatingControls
          ctaHref="/tecnicos"
          ctaLabel="Buscando Técnicos Cercanos"
        />
      </div>
    </AppShell>
  )
}

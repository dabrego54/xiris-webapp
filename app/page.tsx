import AppShell from "@/components/AppShell"
import MapViewport from "@/components/MapViewport"
import PrimaryCTA from "@/components/PrimaryCTA"

export default function HomePage() {
  return (
    <AppShell>
      <div className="relative h-full w-full">
        <MapViewport />
        <div className="pointer-events-auto fixed bottom-24 left-1/2 z-[10000] -translate-x-1/2 lg:bottom-8 lg:left-auto lg:right-8 lg:translate-x-0">
          <PrimaryCTA href="/tecnicos">Buscando Técnicos Cercanos</PrimaryCTA>
        </div>
      </div>
    </AppShell>
  )
}

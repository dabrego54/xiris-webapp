import AppShell from "@/components/AppShell"
import MapFloatingControls from "@/components/MapFloatingControls"
import MapViewport from "@/components/MapViewport"

export default function HomePage() {
  return (
    <AppShell>
      <div className="relative h-full w-full">
        <MapViewport
          renderBottomControls={({ centerMap, canCenter }) => (
            <MapFloatingControls
              onCenter={centerMap}
              canCenter={canCenter}
              ctaHref="/tecnicos"
              ctaLabel="Buscando Técnicos Cercanos"
            />
          )}
        />
      </div>
    </AppShell>
  )
}

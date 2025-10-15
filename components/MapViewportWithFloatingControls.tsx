"use client"

import MapFloatingControls from "./MapFloatingControls"
import MapViewport, { type MapViewportProps } from "./MapViewport"

type MapViewportWithFloatingControlsProps = Omit<MapViewportProps, "renderBottomControls"> & {
  ctaHref: string
  ctaLabel: string
}

export default function MapViewportWithFloatingControls({
  ctaHref,
  ctaLabel,
  ...viewportProps
}: MapViewportWithFloatingControlsProps) {
  return (
    <MapViewport
      {...viewportProps}
      renderBottomControls={({ centerMap, canCenter }) => (
        <MapFloatingControls
          onCenter={centerMap}
          canCenter={canCenter}
          ctaHref={ctaHref}
          ctaLabel={ctaLabel}
        />
      )}
    />
  )
}

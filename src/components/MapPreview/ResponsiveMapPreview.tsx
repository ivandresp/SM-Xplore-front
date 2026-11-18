import { useEffect, useRef, useState } from 'react'
import { MapPreview } from './MapPreview'
import type { MapPreviewProps } from './MapPreview'

/** Mapa de ubicación con dimensiones reales, sin estirar los tiles. */
export function ResponsiveMapPreview({ label, latitude, longitude }: Pick<MapPreviewProps, 'label' | 'latitude' | 'longitude'>) {
  const container = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 256, height: 220 })

  useEffect(() => {
    const element = container.current
    if (element === null) return
    const measure = () => {
      const available = Math.floor(element.getBoundingClientRect().width)
      if (available <= 0) return
      const width = Math.min(1024, available)
      const height = Math.max(220, Math.min(512, Math.round(width * 9 / 16)))
      setDimensions((previous) => previous.width === width && previous.height === height ? previous : { width, height })
    }
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={container}>
      <MapPreview label={label} latitude={latitude} longitude={longitude} width={dimensions.width} height={dimensions.height} zoomControls />
    </div>
  )
}

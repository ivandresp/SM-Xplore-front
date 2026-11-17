import { useCallback, useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent, MouseEvent, PointerEvent } from 'react'
import { MapPreview } from '@/components/MapPreview'
import type { MapLoadState } from '@/components/MapPreview'
import {
  coordinatePoint,
  MAX_ZOOM,
  projectPoint,
  TILE_SIZE,
  unprojectPoint,
} from '@/components/MapPreview/mercator'
import type { MapPoint } from '@/components/MapPreview/mercator'
import { useLanguage } from '@/hooks/useLanguage'
import { translate as t } from '@/i18n/language'
import styles from './LocationPicker.module.css'

export interface LocationPickerProps {
  value: MapPoint | null
  onChange: (point: MapPoint | null) => void
  disabled?: boolean
  defaultCenter?: MapPoint
}

const SANTA_MARTA: MapPoint = { latitude: 11.2404, longitude: -74.199 }
const DEFAULT_ZOOM = 14
const PAN_STEP = 64
const DRAG_THRESHOLD = 5
const NO_OFFSET = { x: 0, y: 0 }

interface Gesture {
  pointerId: number
  startX: number
  startY: number
  moved: boolean
}

function validPoint(point: MapPoint | null | undefined): MapPoint | null {
  return coordinatePoint(point?.latitude, point?.longitude)
}

function roundedPoint(point: MapPoint): MapPoint {
  return {
    latitude: Number(point.latitude.toFixed(6)),
    longitude: Number(point.longitude.toFixed(6)),
  }
}

/** Camera movement is independent from the controlled, explicitly chosen point. */
export function LocationPicker({
  value,
  onChange,
  disabled = false,
  defaultCenter,
}: LocationPickerProps) {
  useLanguage()
  const [camera, setCamera] = useState<MapPoint>(() =>
    validPoint(value) ?? validPoint(defaultCenter) ?? SANTA_MARTA,
  )
  const [zoom, setZoom] = useState(DEFAULT_ZOOM)
  const [size, setSize] = useState(TILE_SIZE)
  const [loadState, setLoadState] = useState<MapLoadState>('loading')
  const [panOffset, setPanOffset] = useState(NO_OFFSET)
  const [attempt, setAttempt] = useState(0)
  const frameRef = useRef<HTMLDivElement>(null)
  const gestureRef = useRef<Gesture | null>(null)
  const suppressClickRef = useRef(false)
  const helpId = useId()
  const selected = validPoint(value)
  const canSelect = !disabled && loadState === 'ready'

  useEffect(() => {
    const element = frameRef.current
    if (element === null) return

    const measure = (width: number) => {
      if (width > 0) setSize(Math.max(2, Math.min(384, Math.floor(width))))
    }
    measure(element.getBoundingClientRect().width)
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry !== undefined) measure(entry.contentRect.width)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const reportLoadState = useCallback((state: MapLoadState) => setLoadState(state), [])

  function moveCamera(dx: number, dy: number) {
    if (disabled) return
    const center = projectPoint(camera.latitude, camera.longitude, zoom)
    const next = unprojectPoint(center.x + dx / TILE_SIZE, center.y + dy / TILE_SIZE, zoom)
    if (next.latitude === camera.latitude && next.longitude === camera.longitude) return
    setLoadState('loading')
    setCamera(next)
    setPanOffset(NO_OFFSET)
  }

  function selectPixel(x: number, y: number) {
    if (!canSelect) return
    const center = projectPoint(camera.latitude, camera.longitude, zoom)
    const point = unprojectPoint(
      center.x + (Math.max(1, Math.min(size - 1, x)) - size / 2) / TILE_SIZE,
      center.y + (Math.max(1, Math.min(size - 1, y)) - size / 2) / TILE_SIZE,
      zoom,
    )
    onChange(roundedPoint(point))
  }

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (!canSelect || event.button !== 0 || gestureRef.current !== null) return
    suppressClickRef.current = false
    gestureRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    const gesture = gestureRef.current
    if (gesture === null || gesture.pointerId !== event.pointerId || !canSelect) return
    const x = event.clientX - gesture.startX
    const y = event.clientY - gesture.startY
    if (Math.hypot(x, y) >= DRAG_THRESHOLD) gesture.moved = true
    if (gesture.moved) setPanOffset({ x, y })
  }

  function handlePointerUp(event: PointerEvent<HTMLButtonElement>) {
    const gesture = gestureRef.current
    if (gesture === null || gesture.pointerId !== event.pointerId) return
    gestureRef.current = null
    suppressClickRef.current = true
    event.currentTarget.releasePointerCapture?.(event.pointerId)
    if (!canSelect) {
      setPanOffset(NO_OFFSET)
      return
    }
    const distance = Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY)
    if (gesture.moved || distance >= DRAG_THRESHOLD) {
      moveCamera(gesture.startX - event.clientX, gesture.startY - event.clientY)
    } else {
      const bounds = event.currentTarget.getBoundingClientRect()
      selectPixel(event.clientX - bounds.left, event.clientY - bounds.top)
    }
  }

  function cancelGesture() {
    gestureRef.current = null
    suppressClickRef.current = true
    setPanOffset(NO_OFFSET)
  }

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    // Native Enter/Space activation has detail=0 and selects the camera center.
    if (event.detail === 0) {
      selectPixel(size / 2, size / 2)
    } else if (!suppressClickRef.current) {
      const bounds = event.currentTarget.getBoundingClientRect()
      selectPixel(event.clientX - bounds.left, event.clientY - bounds.top)
    }
    suppressClickRef.current = false
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const direction = {
      ArrowLeft: [-PAN_STEP, 0],
      ArrowRight: [PAN_STEP, 0],
      ArrowUp: [0, -PAN_STEP],
      ArrowDown: [0, PAN_STEP],
    }[event.key]
    if (direction === undefined) return
    event.preventDefault()
    if (!canSelect) return
    moveCamera(direction[0], direction[1])
  }

  function changeZoom(delta: number) {
    if (disabled) return
    cancelGesture()
    setLoadState('loading')
    if (selected !== null) setCamera(selected)
    setZoom((current) => Math.max(0, Math.min(MAX_ZOOM, current + delta)))
  }

  function retry() {
    if (disabled) return
    cancelGesture()
    setLoadState('loading')
    setAttempt((current) => current + 1)
  }

  let marker: { x: number; y: number } | null = null
  if (selected !== null) {
    const point = projectPoint(selected.latitude, selected.longitude, zoom)
    const center = projectPoint(camera.latitude, camera.longitude, zoom)
    const world = 2 ** zoom
    const difference = point.x - center.x
    const dx = difference - Math.round(difference / world) * world
    const x = size / 2 + dx * TILE_SIZE + panOffset.x
    const y = size / 2 + (point.y - center.y) * TILE_SIZE + panOffset.y
    if (x >= 1 && x <= size - 1 && y >= 1 && y <= size - 1) marker = { x, y }
  }

  return (
    <div className={styles.picker} role="group" aria-label={t('Ubicación del sitio')}>
      <p className={styles.label}>{t('Ubicación del sitio')}</p>
      <p id={helpId} className={styles.help}>
        {t('Haz clic o toca para elegir un punto. Arrastra o usa las flechas para mover el mapa; Enter o Espacio eligen el centro.')}
      </p>
      <div className={styles.frame} ref={frameRef}>
        <MapPreview
          key={attempt}
          latitude={camera.latitude}
          longitude={camera.longitude}
          label={t('Ubicación del sitio')}
          zoom={zoom}
          size={size}
          zoomControls={false}
          showMarker={false}
          panOffset={panOffset}
          onLoadStateChange={reportLoadState}
        />
        <button
          type="button"
          className={styles.surface}
          style={{ width: size, height: size }}
          disabled={disabled}
          aria-disabled={!canSelect}
          aria-label={t('Elegir punto en el mapa')}
          aria-describedby={helpId}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={cancelGesture}
          onLostPointerCapture={cancelGesture}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
        />
        <div className={styles.markerLayer} style={{ width: size, height: size }} aria-hidden="true">
          <span className={styles.crosshair} />
          {marker !== null && (
            <span className={styles.marker} style={{ left: marker.x, top: marker.y }}
              aria-label={t('Punto seleccionado')} />
          )}
        </div>
      </div>
      <div className={styles.controls} role="group" aria-label={t('Controles de ubicación')}>
        <button type="button" className={styles.control} onClick={() => changeZoom(1)}
          disabled={disabled || zoom >= MAX_ZOOM} aria-label={t('Acercar mapa')}>+</button>
        <button type="button" className={styles.control} onClick={() => changeZoom(-1)}
          disabled={disabled || zoom <= 0} aria-label={t('Alejar mapa')}>−</button>
        <button type="button" className={styles.control} onClick={() => moveCamera(0, -PAN_STEP)}
          disabled={disabled} aria-label={t('Mover mapa al norte')}>↑</button>
        <button type="button" className={styles.control} onClick={() => moveCamera(-PAN_STEP, 0)}
          disabled={disabled} aria-label={t('Mover mapa al oeste')}>←</button>
        <button type="button" className={styles.control} onClick={() => moveCamera(PAN_STEP, 0)}
          disabled={disabled} aria-label={t('Mover mapa al este')}>→</button>
        <button type="button" className={styles.control} onClick={() => moveCamera(0, PAN_STEP)}
          disabled={disabled} aria-label={t('Mover mapa al sur')}>↓</button>
      </div>
      <p className={styles.status} role="status">
        {loadState === 'loading'
          ? t('Cargando el mapa antes de elegir una ubicación…')
          : loadState === 'error'
            ? t('El mapa no está disponible. Reintenta para elegir una ubicación; el punto anterior se conserva.')
            : selected === null
              ? t('Todavía no has elegido una ubicación.')
              : t('Punto seleccionado: {0}, {1}', [selected.latitude.toFixed(6), selected.longitude.toFixed(6)])}
      </p>
      <div className={styles.actions}>
        {loadState === 'error' && (
          <button type="button" className={styles.action} onClick={retry} disabled={disabled}>
            {t('Reintentar mapa')}
          </button>
        )}
        {selected !== null && (
          <button type="button" className={styles.action} onClick={() => onChange(null)} disabled={disabled}>
            {t('Quitar punto seleccionado')}
          </button>
        )}
      </div>
    </div>
  )
}

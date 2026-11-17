import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LocationPicker } from './LocationPicker'

const map = vi.hoisted(() => ({
  state: 'ready' as 'loading' | 'ready' | 'error',
  report: undefined as undefined | ((state: 'loading' | 'ready' | 'error') => void),
  mounted: 0,
}))

vi.mock('@/components/MapPreview', async () => {
  const { useEffect } = await import('react')
  return {
    MapPreview: (props: {
      latitude: number
      longitude: number
      zoom: number
      size: number
      panOffset: { x: number; y: number }
      onLoadStateChange: (state: 'loading' | 'ready' | 'error') => void
    }) => {
      const { latitude, longitude, zoom, size, onLoadStateChange } = props
      useEffect(() => {
        map.mounted += 1
        map.report = onLoadStateChange
        onLoadStateChange(map.state)
      }, [latitude, longitude, zoom, size, onLoadStateChange])
      return (
        <div>
          <div role="img" aria-label="Mapa de prueba" data-testid="map"
            data-latitude={props.latitude} data-longitude={props.longitude}
            data-zoom={props.zoom} data-size={props.size}
            data-pan-x={props.panOffset.x} data-pan-y={props.panOffset.y} />
          <a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a>
        </div>
      )
    },
  }
})

beforeEach(() => {
  map.state = 'ready'
  map.report = undefined
  map.mounted = 0
  class TestPointerEvent extends MouseEvent {
    readonly pointerId: number
    constructor(type: string, options: PointerEventInit = {}) {
      super(type, options)
      this.pointerId = options.pointerId ?? 1
    }
  }
  vi.stubGlobal('PointerEvent', TestPointerEvent)
})

afterEach(() => vi.unstubAllGlobals())

function selectionButton() {
  return screen.getByRole('button', { name: 'Elegir punto en el mapa' })
}

function renderPicker(overrides: Partial<Parameters<typeof LocationPicker>[0]> = {}) {
  const onChange = vi.fn()
  const result = render(<LocationPicker value={null} onChange={onChange}
    defaultCenter={{ latitude: 0, longitude: 0 }} {...overrides} />)
  return { ...result, onChange }
}

describe('LocationPicker', () => {
  it('selecciona el centro y un punto conocido con números redondeados', () => {
    const { onChange } = renderPicker()
    fireEvent.click(selectionButton(), { clientX: 128, clientY: 128, detail: 1 })
    expect(onChange).toHaveBeenLastCalledWith({ latitude: 0, longitude: 0 })
    fireEvent.click(selectionButton(), { clientX: 192, clientY: 128, detail: 1 })
    expect(onChange).toHaveBeenLastCalledWith({ latitude: 0, longitude: 0.005493 })
  })

  it('arrastrar solo desplaza la cámara al soltar y conserva la selección', () => {
    const { onChange } = renderPicker({ value: { latitude: 0, longitude: 0 } })
    const overlay = selectionButton()
    fireEvent.pointerDown(overlay, { clientX: 100, clientY: 100, button: 0, pointerId: 1 })
    fireEvent.pointerMove(overlay, { clientX: 164, clientY: 100, pointerId: 1 })
    expect(screen.getByTestId('map').getAttribute('data-longitude')).toBe('0')
    expect(screen.getByTestId('map').getAttribute('data-pan-x')).toBe('64')
    fireEvent.pointerUp(overlay, { clientX: 164, clientY: 100, pointerId: 1 })
    fireEvent.click(overlay, { clientX: 164, clientY: 100, detail: 1 })
    expect(Number(screen.getByTestId('map').getAttribute('data-longitude'))).toBeLessThan(0)
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Punto seleccionado')).toBeTruthy()
  })

  it('acercar y alejar conservan el valor seleccionado', () => {
    const { onChange } = renderPicker({ value: { latitude: 0, longitude: 0 } })
    fireEvent.click(screen.getByRole('button', { name: 'Acercar mapa' }))
    expect(screen.getByTestId('map').getAttribute('data-zoom')).toBe('15')
    fireEvent.click(screen.getByRole('button', { name: 'Alejar mapa' }))
    expect(screen.getByTestId('map').getAttribute('data-zoom')).toBe('14')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('flechas desplazan y la activación por teclado selecciona el centro sin submit', () => {
    const { onChange } = renderPicker()
    fireEvent.keyDown(selectionButton(), { key: 'ArrowRight' })
    expect(Number(screen.getByTestId('map').getAttribute('data-longitude'))).toBeGreaterThan(0)
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.click(selectionButton(), { detail: 0 })
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange.mock.calls[0][0].longitude).toBeGreaterThan(0)
    expect(selectionButton().getAttribute('type')).toBe('button')
  })

  it('no permite elegir con tiles pendientes, error o disabled y permite reintento', () => {
    map.state = 'loading'
    const { onChange, rerender } = renderPicker()
    expect((selectionButton() as HTMLButtonElement).disabled).toBe(false)
    expect(selectionButton().getAttribute('aria-disabled')).toBe('true')
    act(() => map.report?.('error'))
    expect((selectionButton() as HTMLButtonElement).disabled).toBe(false)
    expect(selectionButton().getAttribute('aria-disabled')).toBe('true')
    expect((screen.getByRole('button', { name: 'Acercar mapa' }) as HTMLButtonElement).disabled).toBe(false)
    const mountsBeforeRetry = map.mounted
    map.state = 'ready'
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar mapa' }))
    expect(map.mounted).toBeGreaterThan(mountsBeforeRetry)
    expect((selectionButton() as HTMLButtonElement).disabled).toBe(false)
    expect(selectionButton().getAttribute('aria-disabled')).toBe('false')
    rerender(<LocationPicker value={null} onChange={onChange} disabled />)
    expect((selectionButton() as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Acercar mapa' }) as HTMLButtonElement).disabled).toBe(true)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('conserva foco tras flecha, carga y listo; durante carga bloquea selección y scroll', () => {
    const { onChange } = renderPicker()
    const overlay = selectionButton()
    overlay.focus()
    map.state = 'loading'
    fireEvent.keyDown(overlay, { key: 'ArrowRight' })
    expect(document.activeElement).toBe(overlay)
    expect(overlay.getAttribute('aria-disabled')).toBe('true')
    const previousLongitude = screen.getByTestId('map').getAttribute('data-longitude')
    expect(fireEvent.keyDown(overlay, { key: 'ArrowRight', cancelable: true })).toBe(false)
    fireEvent.click(overlay, { detail: 0 })
    expect(screen.getByTestId('map').getAttribute('data-longitude')).toBe(previousLongitude)
    expect(onChange).not.toHaveBeenCalled()
    act(() => map.report?.('ready'))
    expect(document.activeElement).toBe(overlay)
    expect(overlay.getAttribute('aria-disabled')).toBe('false')
    fireEvent.click(overlay, { detail: 0 })
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('un toque elige una vez y cancelar un arrastre no mueve cámara ni punto', () => {
    const { onChange } = renderPicker()
    const overlay = selectionButton()
    fireEvent.pointerDown(overlay, { clientX: 128, clientY: 128, button: 0, pointerId: 1 })
    fireEvent.pointerUp(overlay, { clientX: 129, clientY: 128, pointerId: 1 })
    fireEvent.click(overlay, { clientX: 129, clientY: 128, detail: 1 })
    expect(onChange).toHaveBeenCalledTimes(1)
    fireEvent.pointerDown(overlay, { clientX: 100, clientY: 100, button: 0, pointerId: 2 })
    fireEvent.pointerMove(overlay, { clientX: 160, clientY: 100, pointerId: 2 })
    fireEvent.pointerCancel(overlay, { pointerId: 2 })
    expect(screen.getByTestId('map').getAttribute('data-longitude')).toBe('0')
    expect(screen.getByTestId('map').getAttribute('data-pan-x')).toBe('0')
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  it('mide el ancho entero y mantiene el mapa dentro de 384px', () => {
    let notify: (entries: ResizeObserverEntry[]) => void = () => undefined
    vi.stubGlobal('ResizeObserver', class {
      constructor(callback: ResizeObserverCallback) {
        notify = (entries) => callback(entries, this)
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    })
    renderPicker()
    const notifyWidth = (width: number) => act(() => notify([{
      target: selectionButton(), contentRect: new DOMRect(0, 0, width, width),
      borderBoxSize: [], contentBoxSize: [], devicePixelContentBoxSize: [],
    }]))
    notifyWidth(327.8)
    expect(screen.getByTestId('map').getAttribute('data-size')).toBe('327')
    notifyWidth(700)
    expect(screen.getByTestId('map').getAttribute('data-size')).toBe('384')
  })

  it('al alejarse oculta el marcador fuera de vista y el zoom vuelve al punto elegido', () => {
    const { onChange } = renderPicker({ value: { latitude: 0, longitude: 0 } })
    for (let i = 0; i < 4; i += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'Mover mapa al este' }))
    }
    expect(screen.queryByLabelText('Punto seleccionado')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Acercar mapa' }))
    expect(screen.getByTestId('map').getAttribute('data-longitude')).toBe('0')
    expect(screen.getByLabelText('Punto seleccionado')).toBeTruthy()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('el enlace de atribución queda fuera del botón y de la imagen', () => {
    renderPicker()
    const credit = screen.getByRole('link', { name: /OpenStreetMap/ })
    expect(selectionButton().contains(credit)).toBe(false)
    expect(screen.getByRole('img').contains(credit)).toBe(false)
  })
})

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StateMessage } from './StateMessage'

describe('StateMessage', () => {
  it('se anuncia como alerta solo cuando es un error', () => {
    const { unmount } = render(<StateMessage title="No hay datos" />)
    expect(screen.queryByRole('alert')).toBeNull()
    unmount()

    render(<StateMessage title="No se pudo cargar" tone="error" />)
    expect(screen.getByRole('alert').textContent).toContain('No se pudo cargar')
  })

  it('muestra la descripción y la acción con salida', () => {
    render(
      <StateMessage
        title="No hay reservas"
        description="Reserva una actividad para verla aquí."
        action={<button type="button">Explorar</button>}
      />,
    )
    expect(screen.getByText('Reserva una actividad para verla aquí.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Explorar' })).toBeTruthy()
  })
})

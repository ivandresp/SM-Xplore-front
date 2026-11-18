import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { ActivityResponse } from '@/types'
import { formatCurrency, formatDuration } from '@/utils/format'
import { ActivityCard } from './ActivityCard'

const activity: ActivityResponse = {
  id: 'a-1', siteId: 's-1', guideId: 'g-1', name: 'Snorkel en Taganga',
  category: 'Aventura', status: 'PUBLISHED', price: 120000, maxCapacity: 10,
  durationMinutes: 90, startsAt: '2026-12-01T08:00:00Z',
  endsAt: '2026-12-01T09:30:00Z', description: null,
}

function renderCard(value = activity) {
  render(
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<ActivityCard activity={value} />} />
        <Route path="/actividades/:activityId" element={<h1>Detalle de actividad</h1>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ActivityCard', () => {
  it('enlaza toda la card con espacio de imagen, categoría, duración y precio', async () => {
    const user = userEvent.setup()
    renderCard()
    const card = screen.getByRole('link', { name: activity.name })
    expect(card.getAttribute('href')).toBe('/actividades/a-1')
    expect(card.contains(screen.getByRole('heading', { name: activity.name }))).toBe(true)
    for (const text of ['Sin foto', activity.category, formatDuration(activity.durationMinutes), formatCurrency(activity.price)]) {
      expect(card.textContent).toContain(text)
    }
    expect(card.querySelector('a, button')).toBeNull()
    await user.click(screen.getByText('Sin foto'))
    expect(screen.getByRole('heading', { name: 'Detalle de actividad' })).toBeTruthy()
  })

  it('muestra la portada guardada', () => {
    const portraitUrl = 'https://example.com/snorkel.jpg'
    renderCard({ ...activity, portraitUrl })
    expect(screen.getByRole('link', { name: activity.name }).querySelector('img')?.getAttribute('src')).toBe(portraitUrl)
  })

  it('permite abrir el detalle con teclado', async () => {
    const user = userEvent.setup()
    renderCard()
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole('link', { name: activity.name }))
    await user.keyboard('{Enter}')
    expect(screen.getByRole('heading', { name: 'Detalle de actividad' })).toBeTruthy()
  })

  it('muestra Gratis cuando el precio es cero', () => {
    renderCard({ ...activity, price: 0 })
    expect(screen.getByText('Gratis')).toBeTruthy()
  })
})

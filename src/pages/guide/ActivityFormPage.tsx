import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/Button'
import { Field } from '@/components/FormField'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { useAuth } from '@/hooks/useAuth'
import { activitiesApi } from '@/services/activitiesApi'
import { sitesApi } from '@/services/sitesApi'
import { zonesApi } from '@/services/zonesApi'
import { combineDateAndTime } from '@/utils/datetime'
import { describeApiError } from '@/utils/errors'
import type { Site, Zone } from '@/types'
import styles from './guide.module.css'

/** El backend guarda una fecha/hora de inicio y otra de fin, no un calendario. */
export default function ActivityFormPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [siteId, setSiteId] = useState('')
  const [zones, setZones] = useState<Zone[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [isLoadingSites, setIsLoadingSites] = useState(true)
  const [sitesError, setSitesError] = useState<string | null>(null)
  const [price, setPrice] = useState('')
  const [maxCapacity, setMaxCapacity] = useState('')
  const [durationHours, setDurationHours] = useState('4')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('12:00')
  const [publish, setPublish] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function run() {
      const [zonesResult, sitesResult] = await Promise.allSettled([
        zonesApi.list(),
        sitesApi.list(),
      ])

      if (cancelled) return

      setIsLoadingSites(false)

      if (zonesResult.status === 'fulfilled') setZones(zonesResult.value)
      if (sitesResult.status === 'fulfilled') {
        setSites(sitesResult.value)
        setSitesError(null)
      } else {
        setSitesError(describeApiError(sitesResult.reason))
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [])

  /** Atractivos agrupados por zona (los huérfanos van al final). */
  const groupedSites = useMemo(() => {
    const byZone = new Map<string, Site[]>()
    for (const site of sites) {
      const list = byZone.get(site.zoneId) ?? []
      list.push(site)
      byZone.set(site.zoneId, list)
    }

    const groups: Array<{ label: string; sites: Site[] }> = []
    const sortedZones = [...zones].sort((a, b) =>
      a.name.localeCompare(b.name, 'es'),
    )

    for (const zone of sortedZones) {
      const zoneSites = (byZone.get(zone.id) ?? []).sort((a, b) =>
        a.name.localeCompare(b.name, 'es'),
      )
      if (zoneSites.length > 0) {
        groups.push({ label: zone.name, sites: zoneSites })
      }
      byZone.delete(zone.id)
    }

    const orphans = [...byZone.values()].flat().sort((a, b) =>
      a.name.localeCompare(b.name, 'es'),
    )
    if (orphans.length > 0) {
      groups.push({ label: 'Otras zonas', sites: orphans })
    }

    return groups
  }, [zones, sites])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (user === null) {
      return
    }

    if (siteId.trim() === '') {
      setError('Selecciona el atractivo donde se realizará la actividad.')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const created = await activitiesApi.create({
        siteId: siteId.trim(),
        guideId: user.id,
        name: name.trim(),
        category: category.trim(),
        description: description.trim() === '' ? undefined : description.trim(),
        price: Number(price),
        maxCapacity: Number(maxCapacity),
        durationMinutes: Math.round(Number(durationHours) * 60),
        startsAt: combineDateAndTime(date, startTime),
        endsAt: combineDateAndTime(date, endTime),
      })

      if (publish) {
        await activitiesApi.changeStatus(created.id, { status: 'PUBLISHED' })
      }

      navigate('/app/mis-actividades')
    } catch (cause) {
      setError(describeApiError(cause))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section>
      <Link to="/app/mis-actividades" className={styles.back}>
        ← Volver a mis actividades
      </Link>

      <PageHeader
        breadcrumb={[
          { label: 'Mis actividades', to: '/app/mis-actividades' },
          { label: 'Nueva actividad' },
        ]}
        title="Registrar nueva actividad"
      />

      {error !== null && (
        <p className={`${styles.feedback} ${styles.error}`} role="alert">
          {error}
        </p>
      )}

      <div className={styles.layout}>
        <form className={styles.card} onSubmit={handleSubmit} noValidate>
          <h2 className={styles.cardTitle}>Información de la actividad</h2>

          <div className={`${styles.grid} ${styles.twoColumns}`}>
            <Field
              label="Nombre de la actividad"
              placeholder="Ej: Snorkel en Playa Cristal"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <Field
              label="Categoría"
              placeholder="Ej: Aventura"
              required
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            />

            <label className={styles.full}>
              <span className={styles.summaryValue}>Descripción</span>
              <textarea
                className={styles.textarea}
                placeholder="Describe la experiencia, qué incluye y recomendaciones…"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>

            <label className={styles.full}>
              <span className={styles.fieldLabel}>Atractivo asociado</span>
              <select
                className={styles.control}
                required
                value={siteId}
                disabled={isLoadingSites}
                onChange={(event) => setSiteId(event.target.value)}
              >
                <option value="">
                  {isLoadingSites
                    ? 'Cargando atractivos…'
                    : 'Selecciona un atractivo…'}
                </option>
                {groupedSites.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.sites.map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.name}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {sitesError !== null && (
                <p className={styles.muted}>{sitesError}</p>
              )}
              {!isLoadingSites && sitesError === null && sites.length === 0 && (
                <p className={styles.muted}>
                  Todavía no hay atractivos registrados: una gestora debe
                  crearlos en Zonas.
                </p>
              )}
            </label>
            <Field
              label="Precio por persona (COP)"
              type="number"
              min={0}
              required
              value={price}
              onChange={(event) => setPrice(event.target.value)}
            />

            <Field
              label="Duración (horas)"
              type="number"
              min={0.5}
              step={0.5}
              required
              value={durationHours}
              onChange={(event) => setDurationHours(event.target.value)}
            />
            <Field
              label="Capacidad máxima (personas)"
              type="number"
              min={1}
              required
              value={maxCapacity}
              onChange={(event) => setMaxCapacity(event.target.value)}
            />

            <Field
              label="Fecha"
              type="date"
              required
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
            <div className={`${styles.grid} ${styles.twoColumns}`}>
              <Field
                label="Hora inicio"
                type="time"
                required
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
              />
              <Field
                label="Hora fin"
                type="time"
                required
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
              />
            </div>
          </div>

          <div className={styles.actions}>
            <Button variant="accent" size="lg" type="submit" disabled={isSaving}>
              {isSaving
                ? 'Guardando…'
                : publish
                  ? 'Publicar actividad'
                  : 'Guardar borrador'}
            </Button>
            <Link to="/app/mis-actividades">
              <Button variant="outline" size="lg">
                Cancelar
              </Button>
            </Link>
          </div>

          <p className={styles.notice}>
            La zona se deduce del atractivo elegido. Del diseño faltan por
            implementar en backend: punto de encuentro, dificultad, idioma,
            cupos por turno, días disponibles (la API guarda una sola fecha) y
            fotos.
          </p>
        </form>

        <div className={styles.column}>
          <article className={styles.card}>
            <h2 className={styles.cardTitle}>Estado</h2>
            <label className={styles.radioRow}>
              <input
                type="radio"
                name="estado"
                checked={!publish}
                onChange={() => setPublish(false)}
              />
              Guardar como borrador
            </label>
            <label className={styles.radioRow}>
              <input
                type="radio"
                name="estado"
                checked={publish}
                onChange={() => setPublish(true)}
              />
              Publicar al guardar
            </label>
          </article>

          <article className={styles.card}>
            <h2 className={styles.cardTitle}>Fotos de la actividad</h2>
            <p className={styles.muted}>
              El backend no permite subir archivos ni guarda fotos de
              actividades: solo acepta URLs, y para servicios.
            </p>
          </article>
        </div>
      </div>
    </section>
  )
}

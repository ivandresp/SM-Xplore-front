import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/Button'
import { Field } from '@/components/FormField'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { Skeleton } from '@/components/Skeleton'
import { StateMessage } from '@/components/StateMessage'
import { eventsApi } from '@/services/eventsApi'
import { sitesApi } from '@/services/sitesApi'
import { zonesApi } from '@/services/zonesApi'
import { combineDateAndTime } from '@/utils/datetime'
import { describeApiError } from '@/utils/errors'
import type { Site, Zone } from '@/types'
import styles from './events.module.css'

export default function EventFormPage() {
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [siteId, setSiteId] = useState('')
  const [zones, setZones] = useState<Zone[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [sitesError, setSitesError] = useState<string | null>(null)
  const [price, setPrice] = useState('')
  const [maxCapacity, setMaxCapacity] = useState('')
  const [expectedAttendance, setExpectedAttendance] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('18:00')
  const [endTime, setEndTime] = useState('22:00')
  const [publish, setPublish] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function run() {
      setIsLoading(true)
      setSitesError(null)

      try {
        const [zonesResult, sitesResult] = await Promise.allSettled([
          zonesApi.list(),
          sitesApi.list(),
        ])

        if (cancelled) return

        if (zonesResult.status === 'fulfilled') setZones(zonesResult.value)
        if (sitesResult.status === 'fulfilled') {
          setSites(sitesResult.value)
          setSitesError(null)
        } else {
          setSitesError(describeApiError(sitesResult.reason))
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [reloadToken])

  function retry() {
    setIsLoading(true)
    setSitesError(null)
    setReloadToken((token) => token + 1)
  }

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

  async function handleSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()

    if (siteId.trim() === '') {
      setError('Selecciona el atractivo donde se realizará el evento.')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const created = await eventsApi.create({
        siteId: siteId.trim(),
        name: name.trim(),
        category: category.trim(),
        description: description.trim() === '' ? undefined : description.trim(),
        price: Number(price),
        maxCapacity: Number(maxCapacity),
        startsAt: combineDateAndTime(date, startTime),
        endsAt: combineDateAndTime(date, endTime),
      })

      if (expectedAttendance.trim() !== '') {
        await eventsApi.estimateAttendance(created.id, {
          expectedAttendance: Number(expectedAttendance),
        })
      }

      if (publish) {
        await eventsApi.changeStatus(created.id, { status: 'PUBLISHED' })
      }

      navigate('/app/eventos')
    } catch (cause) {
      setError(describeApiError(cause))
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <Skeleton variant="text" count={6} label="Cargando formulario…" />
  }

  if (sitesError !== null) {
    return (
      <section>
        <Link to="/app/eventos" className={styles.back}>
          ← Volver a gestión de eventos
        </Link>
        <StateMessage
          title="No se pudieron cargar los atractivos"
          description={sitesError}
          tone="error"
          action={<Button onClick={retry}>Reintentar</Button>}
        />
      </section>
    )
  }

  return (
    <section>
      <Link to="/app/eventos" className={styles.back}>
        ← Volver a gestión de eventos
      </Link>

      <PageHeader
        breadcrumb={[
          { label: 'Eventos', to: '/app/eventos' },
          { label: 'Nuevo evento' },
        ]}
        title="Registrar evento"
      />

      {error !== null && (
        <p className={`${styles.feedback} ${styles.error}`} role="alert">
          {error}
        </p>
      )}

      <div className={styles.detailLayout}>
        <form className={styles.card} onSubmit={handleSubmit} noValidate>
          <h2 className={styles.cardTitle}>Información del evento</h2>

          <div className={`${styles.grid} ${styles.twoColumns}`}>
            <Field
              label="Nombre del evento"
              placeholder="Ej: Festival de Jazz del Caribe"
              required
              value={name}
              onChange={(changeEvent) => setName(changeEvent.target.value)}
            />
            <Field
              label="Categoría"
              placeholder="Ej: Cultural"
              required
              value={category}
              onChange={(changeEvent) => setCategory(changeEvent.target.value)}
            />

            <label className={styles.full}>
              <span className={styles.fieldLabel}>Descripción</span>
              <textarea
                className={styles.textarea}
                placeholder="Describe el evento, artistas o actividades, y recomendaciones para los asistentes…"
                value={description}
                onChange={(changeEvent) => setDescription(changeEvent.target.value)}
              />
            </label>

            <label className={styles.full}>
              <span className={styles.fieldLabel}>Lugar / atractivo</span>
              <select
                className={styles.control}
                required
                value={siteId}
                onChange={(changeEvent) => setSiteId(changeEvent.target.value)}
              >
                <option value="">Selecciona un atractivo…</option>
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
              {sites.length === 0 && (
                <p className={styles.helper}>
                  Todavía no hay atractivos registrados: una gestora debe
                  crearlos en Zonas.
                </p>
              )}
            </label>
            <Field
              label="Precio de entrada (COP)"
              type="number"
              min={0}
              required
              value={price}
              onChange={(changeEvent) => setPrice(changeEvent.target.value)}
            />

            <Field
              label="Aforo / capacidad"
              type="number"
              min={1}
              required
              value={maxCapacity}
              onChange={(changeEvent) => setMaxCapacity(changeEvent.target.value)}
            />
            <Field
              label="Afluencia esperada"
              type="number"
              min={0}
              hint="Alimenta los indicadores de congestión."
              value={expectedAttendance}
              onChange={(changeEvent) =>
                setExpectedAttendance(changeEvent.target.value)
              }
            />

            <Field
              label="Fecha del evento"
              type="date"
              required
              value={date}
              onChange={(changeEvent) => setDate(changeEvent.target.value)}
            />
            <div className={`${styles.grid} ${styles.twoColumns}`}>
              <Field
                label="Hora inicio"
                type="time"
                required
                value={startTime}
                onChange={(changeEvent) => setStartTime(changeEvent.target.value)}
              />
              <Field
                label="Hora fin"
                type="time"
                required
                value={endTime}
                onChange={(changeEvent) => setEndTime(changeEvent.target.value)}
              />
            </div>
          </div>

          <div className={styles.actions}>
            <Button variant="accent" size="lg" type="submit" disabled={isSaving}>
              {isSaving
                ? 'Guardando…'
                : publish
                  ? 'Publicar evento'
                  : 'Guardar borrador'}
            </Button>
            <Link to="/app/eventos">
              <Button variant="outline" size="lg">
                Cancelar
              </Button>
            </Link>
          </div>

          <p className={styles.notice}>
            El lugar se guarda como sitio (atractivo).
          </p>
        </form>

        <div className={styles.column}>
          <article className={styles.card}>
            <h2 className={styles.cardTitle}>Estado</h2>
            <label className={styles.radioRow}>
              <input
                type="radio"
                name="estado-evento"
                checked={!publish}
                onChange={() => setPublish(false)}
              />
              Guardar como borrador
            </label>
            <label className={styles.radioRow}>
              <input
                type="radio"
                name="estado-evento"
                checked={publish}
                onChange={() => setPublish(true)}
              />
              Publicar en la agenda
            </label>
          </article>

          <article className={styles.card}>
            <h2 className={styles.cardTitle}>Imagen del evento</h2>
            <p className={styles.helper}>
              El backend no permite subir archivos ni guarda imágenes de
              eventos.
            </p>
          </article>
        </div>
      </div>
    </section>
  )
}

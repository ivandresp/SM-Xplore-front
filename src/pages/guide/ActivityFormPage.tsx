import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BackButton } from '@/components/BackButton'
import { useMessageState } from '@/hooks/useMessageState'
import { translate as t } from '@/i18n/language'
import { useLanguage } from '@/hooks/useLanguage'
import { Button } from '@/components/Button'
import { CategorySelect } from '@/components/CategorySelect'
import { Field } from '@/components/FormField'
import { ImageUploader } from '@/components/ImageUploader'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { SelectField } from '@/components/SelectField'
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
  useLanguage()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [portraitUrls, setPortraitUrls] = useState<string[]>([])
  const [isUploadingPortrait, setIsUploadingPortrait] = useState(false)
  const [siteId, setSiteId] = useState('')
  const [zones, setZones] = useState<Zone[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [isLoadingSites, setIsLoadingSites] = useState(true)
  const [sitesError, setSitesError] = useMessageState<string | null>(null)
  const [price, setPrice] = useState('')
  const [maxCapacity, setMaxCapacity] = useState('')
  const [durationHours, setDurationHours] = useState('4')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('08:00')
  const [endTime, setEndTime] = useState('12:00')
  const [publish, setPublish] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useMessageState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function run() {
      const [zonesResult, sitesResult] = await Promise.allSettled([
        zonesApi.list(),
        sitesApi.list().then((page) => page.content),
      ])

      if (cancelled) return

      setIsLoadingSites(false)

      if (zonesResult.status === 'fulfilled') setZones(zonesResult.value)
      if (sitesResult.status === 'fulfilled') {
        setSites(sitesResult.value)
        setSitesError(null)
      } else {
        setSitesError(() => describeApiError(sitesResult.reason))
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [setSitesError])

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
      groups.push({ get label() { return t("Otras zonas") }, sites: orphans })
    }

    return groups
  }, [zones, sites])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSaving || isUploadingPortrait) return

    if (user === null) {
      return
    }

    if (siteId.trim() === '') {
      setError(() => t("Selecciona el atractivo donde se realizará la actividad."))
      return
    }

    if (category.trim() === '') {
      setError(() => t("Selecciona una categoría."))
      return
    }

    if (category.trim().length > 50) {
      setError(() => t("La categoría seleccionada supera el máximo de 50 caracteres permitido. Selecciona otra categoría."))
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
        portraitUrl: portraitUrls[0],
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
      setError(() => describeApiError(cause))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section>
      <BackButton to="/app/mis-actividades" />

      <PageHeader
        breadcrumb={[
          { label: t("Mis actividades"), to: '/app/mis-actividades' },
          { label: t("Nueva actividad") },
        ]}
        title={t("Registrar nueva actividad")}
      />

      {error !== null && (
        <p className={`${styles.feedback} ${styles.error}`} role="alert">
          {error}
        </p>
      )}

      <div className={styles.layout}>
        <form className={styles.card} onSubmit={handleSubmit} noValidate>
          <h2 className={styles.cardTitle}>{t("Información de la actividad")}</h2>

          <div className={`${styles.grid} ${styles.twoColumns}`}>
            <Field
              label={t("Nombre de la actividad")}
              placeholder={t("Ej: Snorkel en Playa Cristal")}
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <CategorySelect
              scope="ACTIVITY"
              required
              value={category}
              onChange={setCategory}
              disabled={isSaving}
            />

            <label className={styles.full}>
              <span className={styles.summaryValue}>{t("Descripción")}</span>
              <textarea
                className={styles.textarea}
                placeholder={t("Describe la experiencia, qué incluye y recomendaciones…")}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>

            <ImageUploader
              className={styles.full}
              label={t("Foto de portada")}
              folder="sm-xplore/activities"
              value={portraitUrls}
              onChange={setPortraitUrls}
              onUploadingChange={setIsUploadingPortrait}
              maxFiles={1}
              disabled={isSaving}
            />

            <div className={styles.full}>
              <SelectField
                label={t("Atractivo asociado")}
                required
                placeholder={
                  isLoadingSites
                    ? t("Cargando atractivos…")
                    : t("Selecciona un atractivo…")
                }
                value={siteId}
                disabled={isLoadingSites}
                onChange={(event) => setSiteId(event.target.value)}
                groups={groupedSites.map((group) => ({
                  label: group.label,
                  options: group.sites.map((site) => ({
                    value: site.id,
                    label: site.name,
                  })),
                }))}
              />
              {sitesError !== null && (
                <p className={styles.muted}>{sitesError}</p>
              )}
              {!isLoadingSites && sitesError === null && sites.length === 0 && (
                <p className={styles.muted}>
                  {t("Todavía no hay atractivos registrados: una gestora debe crearlos en Zonas.")}</p>
              )}
            </div>
            <Field
              label={t("Precio por persona (COP)")}
              type="number"
              min={0}
              required
              value={price}
              onChange={(event) => setPrice(event.target.value)}
            />

            <Field
              label={t("Duración (horas)")}
              type="number"
              min={0.5}
              step={0.5}
              required
              value={durationHours}
              onChange={(event) => setDurationHours(event.target.value)}
            />
            <Field
              label={t("Capacidad máxima (personas)")}
              type="number"
              min={1}
              required
              value={maxCapacity}
              onChange={(event) => setMaxCapacity(event.target.value)}
            />

            <Field
              label={t("Fecha")}
              type="date"
              required
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
            <div className={`${styles.grid} ${styles.twoColumns}`}>
              <Field
                label={t("Hora inicio")}
                type="time"
                required
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
              />
              <Field
                label={t("Hora fin")}
                type="time"
                required
                value={endTime}
                onChange={(event) => setEndTime(event.target.value)}
              />
            </div>
          </div>

          <div className={styles.actions}>
            <Button variant="accent" size="lg" type="submit" disabled={isSaving || isUploadingPortrait}>
              {isSaving
                ? t("Guardando…")
                : publish
                  ? t("Publicar actividad")
                  : t("Guardar borrador")}
            </Button>
            <Link to="/app/mis-actividades">
              <Button variant="outline" size="lg">
                {t("Cancelar")}</Button>
            </Link>
          </div>

          <p className={styles.notice}>
            {t("La zona se deduce del atractivo elegido.")}</p>
        </form>

        <div className={styles.column}>
          <article className={styles.card}>
            <h2 className={styles.cardTitle}>{t("Estado")}</h2>
            <label className={styles.radioRow}>
              <input
                type="radio"
                name="estado"
                checked={!publish}
                onChange={() => setPublish(false)}
              />
              {t("Guardar como borrador")}</label>
            <label className={styles.radioRow}>
              <input
                type="radio"
                name="estado"
                checked={publish}
                onChange={() => setPublish(true)}
              />
              {t("Publicar al guardar")}</label>
          </article>

          <article className={styles.card}>
            <h2 className={styles.cardTitle}>{t("Fotos de la actividad")}</h2>
            <p className={styles.muted}>
              {t("Las actividades no admiten fotos por ahora.")}</p>
          </article>
        </div>
      </div>
    </section>
  )
}

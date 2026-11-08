import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/Button'
import { Field, SelectField } from '@/components/FormField'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { Skeleton } from '@/components/Skeleton'
import { StateMessage } from '@/components/StateMessage'
import { StatusBadge } from '@/components/StatusBadge/StatusBadge'
import { CONTENT_STATUS_LABELS, CONTENT_STATUS_TONES } from '@/config/roles'
import { categoriesApi } from '@/services/categoriesApi'
import { sitesApi } from '@/services/sitesApi'
import { zonesApi } from '@/services/zonesApi'
import { describeApiError } from '@/utils/errors'
import type { CategoryResponse, Site, Zone } from '@/types'
import styles from './zones.module.css'

/** Separa las URLs de fotos escritas una por línea. */
function parsePhotoUrls(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
}

function parseCoordinate(raw: string): number | null {
  if (raw.trim() === '') {
    return null
  }

  const value = Number(raw.replace(',', '.'))
  return Number.isFinite(value) ? value : null
}

/** Devuelve el mensaje de error de las coordenadas, o null si son válidas. */
function validateCoordinates(
  latitude: number | null,
  longitude: number | null,
): string | null {
  if (latitude === null || longitude === null) {
    return 'Escribe la latitud y la longitud del sitio.'
  }
  if (latitude < -90 || latitude > 90) {
    return 'La latitud debe estar entre -90 y 90.'
  }
  if (longitude < -180 || longitude > 180) {
    return 'La longitud debe estar entre -180 y 180.'
  }
  return null
}

/** Wireframe: 11-gestionar-destino-frame · Configurar zona turística. */
export default function ZoneFormPage() {
  const { zoneId } = useParams<{ zoneId: string }>()
  const navigate = useNavigate()

  const [zone, setZone] = useState<Zone | null>(null)
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(zoneId !== undefined)
  const [isSavingZone, setIsSavingZone] = useState(false)
  const [zoneError, setZoneError] = useState<string | null>(null)
  const [zoneSuccess, setZoneSuccess] = useState<string | null>(null)

  const [sites, setSites] = useState<Site[]>([])
  const [categories, setCategories] = useState<CategoryResponse[]>([])
  const [isAddingSite, setIsAddingSite] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [newSiteName, setNewSiteName] = useState('')
  const [newCategoryId, setNewCategoryId] = useState('')
  const [newMaxCapacity, setNewMaxCapacity] = useState('10')
  const [newLatitude, setNewLatitude] = useState('')
  const [newLongitude, setNewLongitude] = useState('')
  const [newPhotoUrls, setNewPhotoUrls] = useState('')

  const [editingSiteId, setEditingSiteId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editCategoryId, setEditCategoryId] = useState('')
  const [editMaxCapacity, setEditMaxCapacity] = useState('')
  const [editLatitude, setEditLatitude] = useState('')
  const [editLongitude, setEditLongitude] = useState('')
  const [editPhotoUrls, setEditPhotoUrls] = useState('')
  const [isSavingSite, setIsSavingSite] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [sitesError, setSitesError] = useState<string | null>(null)
  const [statusSiteId, setStatusSiteId] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const isNew = zoneId === undefined

  useEffect(() => {
    if (zoneId === undefined) {
      return
    }

    let cancelled = false

    async function run() {
      setIsLoading(true)
      setZoneError(null)

      try {
        const [found, foundSites, foundCategories] = await Promise.all([
          zonesApi.getById(zoneId as string),
          sitesApi.list(zoneId as string),
          categoriesApi.list('SITE'),
        ])

        if (!cancelled) {
          setZone(found)
          setName(found.name)
          setSites(foundSites)
          setCategories(foundCategories)
          setZoneError(null)
        }
      } catch (cause) {
        if (!cancelled) setZoneError(describeApiError(cause))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [zoneId, reloadToken])

  function retry() {
    setIsLoading(true)
    setZoneError(null)
    setReloadToken((token) => token + 1)
  }

  async function handleSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()

    const trimmed = name.trim()
    if (trimmed === '') {
      setZoneError('Escribe el nombre de la zona.')
      return
    }

    setIsSavingZone(true)
    setZoneError(null)
    setZoneSuccess(null)

    try {
      if (zone === null) {
        const created = await zonesApi.create({ name: trimmed })
        // Se navega a la edición para poder añadir los sitios de la zona.
        navigate(`/app/zonas/${created.id}`)
        return
      }

      const updated = await zonesApi.update(zone.id, { name: trimmed })
      setZone(updated)
      setName(updated.name)
      setZoneSuccess('Nombre de la zona actualizado.')
    } catch (cause) {
      setZoneError(describeApiError(cause))
    } finally {
      setIsSavingZone(false)
    }
  }

  async function handleAddSite(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()

    if (zone === null) {
      return
    }

    const trimmedName = newSiteName.trim()
    if (trimmedName === '') {
      setAddError('Escribe el nombre del sitio.')
      return
    }

    const latitude = parseCoordinate(newLatitude)
    const longitude = parseCoordinate(newLongitude)
    const coordinateError = validateCoordinates(latitude, longitude)
    if (coordinateError !== null) {
      setAddError(coordinateError)
      return
    }

    if (newCategoryId === '') {
      setAddError('Selecciona la categoría del atractivo.')
      return
    }

    const capacity = Number(newMaxCapacity)
    if (!Number.isInteger(capacity) || capacity < 1) {
      setAddError('La capacidad debe ser un número entero mayor que cero.')
      return
    }

    setIsAddingSite(true)
    setAddError(null)

    try {
      const created = await sitesApi.create({
        zoneId: zone.id,
        name: trimmedName,
        categoryId: newCategoryId,
        latitude: latitude as number,
        longitude: longitude as number,
        maxCapacity: capacity,
        photoUrls: parsePhotoUrls(newPhotoUrls),
      })

      setSites((current) => [...current, created])
      setNewSiteName('')
      setNewLatitude('')
      setNewLongitude('')
      setNewPhotoUrls('')
    } catch (cause) {
      setAddError(describeApiError(cause))
    } finally {
      setIsAddingSite(false)
    }
  }

  function startEditSite(site: Site) {
    setEditingSiteId(site.id)
    setEditName(site.name)
    setEditCategoryId(site.categoryId ?? '')
    setEditMaxCapacity(String(site.maxCapacity))
    setEditLatitude(String(site.latitude))
    setEditLongitude(String(site.longitude))
    setEditPhotoUrls(site.photoUrls.join('\n'))
    setEditError(null)
  }

  async function toggleSiteStatus(site: Site) {
    setStatusSiteId(site.id)
    setSitesError(null)

    try {
      const updated = await sitesApi.changeStatus(
        site.id,
        site.status === 'PUBLISHED' ? 'INACTIVE' : 'PUBLISHED',
      )
      setSites((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      )
    } catch (cause) {
      setSitesError(describeApiError(cause))
    } finally {
      setStatusSiteId(null)
    }
  }

  async function saveSite(site: Site) {
    const trimmedName = editName.trim()
    if (trimmedName === '') {
      setEditError('Escribe el nombre del sitio.')
      return
    }

    const latitude = parseCoordinate(editLatitude)
    const longitude = parseCoordinate(editLongitude)
    const coordinateError = validateCoordinates(latitude, longitude)
    if (coordinateError !== null) {
      setEditError(coordinateError)
      return
    }

    if (editCategoryId === '') {
      setEditError('Selecciona la categoría del atractivo.')
      return
    }

    const capacity = Number(editMaxCapacity)
    if (!Number.isInteger(capacity) || capacity < 1) {
      setEditError('La capacidad debe ser un número entero mayor que cero.')
      return
    }

    setIsSavingSite(true)
    setEditError(null)

    try {
      const updated = await sitesApi.update(site.id, {
        name: trimmedName,
        categoryId: editCategoryId,
        zoneId: site.zoneId,
        latitude: latitude as number,
        longitude: longitude as number,
        maxCapacity: capacity,
        photoUrls: parsePhotoUrls(editPhotoUrls),
      })

      setSites((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      )
      setEditingSiteId(null)
    } catch (cause) {
      setEditError(describeApiError(cause))
    } finally {
      setIsSavingSite(false)
    }
  }

  if (isLoading) {
    return <Skeleton variant="text" count={4} label="Cargando zona…" />
  }

  if (!isNew && zone === null) {
    return (
      <section>
        <Link to="/app/zonas" className={styles.back}>
          ← Volver a zonas
        </Link>
        <StateMessage
          title="No se pudo cargar la zona"
          description={zoneError ?? 'No se encontró la zona.'}
          tone="error"
          action={<Button onClick={retry}>Reintentar</Button>}
        />
      </section>
    )
  }

  return (
    <section>
      <Link to="/app/zonas" className={styles.back}>
        ← Volver a zonas
      </Link>

      <PageHeader
        breadcrumb={[
          { label: 'Zonas', to: '/app/zonas' },
          ...(isNew || zone === null
            ? [{ label: 'Nueva zona' }]
            : [{ label: zone.name }]),
        ]}
        title={isNew ? 'Nueva zona turística' : 'Configurar zona turística'}
      />

      {zoneError !== null && (
        <p className={`${styles.feedback} ${styles.error}`} role="alert">
          {zoneError}
        </p>
      )}

      {zoneSuccess !== null && (
        <p className={`${styles.feedback} ${styles.success}`} role="status">
          {zoneSuccess}
        </p>
      )}

      <div className={styles.layout}>
        <div className={styles.column}>
          <form className={styles.card} onSubmit={handleSubmit} noValidate>
            <h2 className={styles.cardTitle}>Información de la zona</h2>

            <Field
              label="Nombre de la zona"
              placeholder="Ej: Centro Histórico"
              required
              value={name}
              onChange={(changeEvent) => setName(changeEvent.target.value)}
            />

            <div className={styles.actions}>
              <Button variant="primary" type="submit" disabled={isSavingZone}>
                {isSavingZone
                  ? 'Guardando…'
                  : isNew
                    ? 'Crear zona'
                    : 'Guardar nombre'}
              </Button>
              <Link to="/app/zonas">
                <Button variant="outline">Cancelar</Button>
              </Link>
            </div>
          </form>

          {zone !== null && (
            <article className={styles.card}>
              <h2 className={styles.cardTitle}>Sitios de la zona</h2>

              <ul className={styles.siteList}>
                {sites.length === 0 && (
                  <li className={styles.helper}>
                    Esta zona todavía no tiene sitios.
                  </li>
                )}

                {sites.map((site) => (
                  <li key={site.id} className={styles.siteRow}>
                    {editingSiteId === site.id ? (
                      <div className={styles.siteForm}>
                        <Field
                          label="Nombre del sitio"
                          required
                          value={editName}
                          onChange={(changeEvent) =>
                            setEditName(changeEvent.target.value)
                          }
                        />

                        <div className={`${styles.grid} ${styles.twoColumns}`}>
                          <SelectField
                            label="Categoría"
                            required
                            value={editCategoryId}
                            options={[
                              { value: '', label: 'Selecciona una categoría' },
                              ...categories.map((category) => ({
                                value: category.id,
                                label: category.name,
                              })),
                            ]}
                            onChange={(changeEvent) =>
                              setEditCategoryId(changeEvent.target.value)
                            }
                          />
                          <Field
                            label="Capacidad máxima"
                            type="number"
                            min={1}
                            required
                            value={editMaxCapacity}
                            onChange={(changeEvent) =>
                              setEditMaxCapacity(changeEvent.target.value)
                            }
                          />
                        </div>

                        <div className={`${styles.grid} ${styles.twoColumns}`}>
                          <Field
                            label="Latitud"
                            type="number"
                            step="any"
                            min={-90}
                            max={90}
                            required
                            value={editLatitude}
                            onChange={(changeEvent) =>
                              setEditLatitude(changeEvent.target.value)
                            }
                          />
                          <Field
                            label="Longitud"
                            type="number"
                            step="any"
                            min={-180}
                            max={180}
                            required
                            value={editLongitude}
                            onChange={(changeEvent) =>
                              setEditLongitude(changeEvent.target.value)
                            }
                          />
                        </div>

                        <label className={styles.full}>
                          <span className={styles.fieldLabel}>
                            Fotos por URL (una por línea, opcional)
                          </span>
                          <textarea
                            className={styles.textarea}
                            placeholder="https://…"
                            value={editPhotoUrls}
                            onChange={(changeEvent) =>
                              setEditPhotoUrls(changeEvent.target.value)
                            }
                          />
                        </label>

                        {editError !== null && (
                          <p
                            className={`${styles.feedback} ${styles.error}`}
                            role="alert"
                          >
                            {editError}
                          </p>
                        )}

                        <div className={styles.actions}>
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={isSavingSite}
                            onClick={() => void saveSite(site)}
                          >
                            {isSavingSite ? 'Guardando…' : 'Guardar sitio'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingSiteId(null)}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className={styles.siteInfo}>
                          <p className={styles.siteTitle}>{site.name}</p>
                          <p className={styles.helper}>
                            {site.maxCapacity} personas ·{' '}
                            {site.latitude.toFixed(5)},{' '}
                            {site.longitude.toFixed(5)} ·{' '}
                            {site.photoUrls.length}{' '}
                            {site.photoUrls.length === 1 ? 'foto' : 'fotos'}
                          </p>
                        </div>
                        <StatusBadge tone={CONTENT_STATUS_TONES[site.status]}>
                          {CONTENT_STATUS_LABELS[site.status]}
                        </StatusBadge>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={statusSiteId === site.id}
                          onClick={() => void toggleSiteStatus(site)}
                        >
                          {site.status === 'PUBLISHED' ? 'Despublicar' : 'Publicar'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEditSite(site)}
                        >
                          Editar
                        </Button>
                      </>
                    )}
                  </li>
                ))}
              </ul>

              {sitesError !== null && (
                <p className={`${styles.feedback} ${styles.error}`} role="alert">
                  {sitesError}
                </p>
              )}

              <form
                className={styles.siteForm}
                onSubmit={handleAddSite}
                noValidate
              >
                <h3 className={styles.siteFormTitle}>Añadir sitio</h3>

                <Field
                  label="Nombre del sitio o atractivo"
                  placeholder="Ej: Catedral"
                  required
                  value={newSiteName}
                  onChange={(changeEvent) =>
                    setNewSiteName(changeEvent.target.value)
                  }
                />

                <div className={`${styles.grid} ${styles.twoColumns}`}>
                  <SelectField
                    label="Categoría"
                    required
                    hint={
                      categories.length === 0
                        ? 'No hay categorías de atractivos: pide a la gestora que cree una.'
                        : undefined
                    }
                    value={newCategoryId}
                    options={[
                      { value: '', label: 'Selecciona una categoría' },
                      ...categories.map((category) => ({
                        value: category.id,
                        label: category.name,
                      })),
                    ]}
                    onChange={(changeEvent) =>
                      setNewCategoryId(changeEvent.target.value)
                    }
                  />
                  <Field
                    label="Capacidad máxima"
                    type="number"
                    min={1}
                    required
                    value={newMaxCapacity}
                    onChange={(changeEvent) =>
                      setNewMaxCapacity(changeEvent.target.value)
                    }
                  />
                </div>

                <div className={`${styles.grid} ${styles.twoColumns}`}>
                  <Field
                    label="Latitud"
                    type="number"
                    step="any"
                    min={-90}
                    max={90}
                    placeholder="11.24194"
                    required
                    value={newLatitude}
                    onChange={(changeEvent) =>
                      setNewLatitude(changeEvent.target.value)
                    }
                  />
                  <Field
                    label="Longitud"
                    type="number"
                    step="any"
                    min={-180}
                    max={180}
                    placeholder="-74.19904"
                    required
                    value={newLongitude}
                    onChange={(changeEvent) =>
                      setNewLongitude(changeEvent.target.value)
                    }
                  />
                </div>

                <label className={styles.full}>
                  <span className={styles.fieldLabel}>
                    Fotos por URL (una por línea, opcional)
                  </span>
                  <textarea
                    className={styles.textarea}
                    placeholder="https://…"
                    value={newPhotoUrls}
                    onChange={(changeEvent) =>
                      setNewPhotoUrls(changeEvent.target.value)
                    }
                  />
                </label>

                {addError !== null && (
                  <p className={`${styles.feedback} ${styles.error}`} role="alert">
                    {addError}
                  </p>
                )}

                <div className={styles.actions}>
                  <Button
                    variant="outline"
                    type="submit"
                    disabled={isAddingSite}
                  >
                    {isAddingSite ? 'Añadiendo…' : '+ Añadir sitio'}
                  </Button>
                </div>
              </form>
            </article>
          )}
        </div>

        <div className={styles.column}>
          <article className={styles.card}>
            <h2 className={styles.cardTitle}>Qué guarda la API</h2>
            <ul className={styles.bullets}>
              <li>Nombre de la zona (se puede renombrar).</li>
              <li>
                Sitios de la zona: nombre, latitud, longitud y fotos por URL.
              </li>
            </ul>
            <p className={styles.helper}>
              El diseño pide además descripción, capacidad recomendada, umbral
              de congestión, delimitación en el mapa y estado de afluencia: la
              API todavía no los almacena. Tampoco hay endpoint para eliminar
              sitios (sí para editarlos o moverlos de zona).
            </p>
          </article>

          {zone !== null && (
            <article className={styles.card}>
              <h2 className={styles.cardTitle}>Resumen</h2>
              <p className={styles.summaryLine}>
                <span className={styles.summaryLabel}>Zona</span>
                {name.trim() === '' ? zone.name : name}
              </p>
              <p className={styles.summaryLine}>
                <span className={styles.summaryLabel}>Sitios</span>
                {sites.length}
              </p>
            </article>
          )}
        </div>
      </div>
    </section>
  )
}

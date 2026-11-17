import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMessageState } from '@/hooks/useMessageState'
import { translate as t } from '@/i18n/language'
import { useLanguage } from '@/hooks/useLanguage'
import { Button } from '@/components/Button'
import { Field } from '@/components/FormField'
import { ImageUploader } from '@/components/ImageUploader'
import { LocationPicker } from '@/components/LocationPicker'
import type { MapPoint } from '@/components/LocationPicker'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { SelectField } from '@/components/SelectField'
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

/** Devuelve el mensaje de error de las coordenadas, o null si son válidas. */
function validateCoordinates(
  latitude: number | null,
  longitude: number | null,
): string | null {
  if (latitude === null || longitude === null || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return t("Selecciona la ubicación del sitio en el mapa.")
  }
  if (latitude < -90 || latitude > 90) {
    return t("La latitud debe estar entre -90 y 90.")
  }
  if (longitude < -180 || longitude > 180) {
    return t("La longitud debe estar entre -180 y 180.")
  }
  return null
}

/** Wireframe: 11-gestionar-destino-frame · Configurar zona turística. */
export default function ZoneFormPage() {
  useLanguage()
  const { zoneId } = useParams<{ zoneId: string }>()
  const navigate = useNavigate()

  const [zone, setZone] = useState<Zone | null>(null)
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(zoneId !== undefined)
  const [isSavingZone, setIsSavingZone] = useState(false)
  const [zoneError, setZoneError] = useMessageState<string | null>(null)
  const [zoneSuccess, setZoneSuccess] = useMessageState<string | null>(null)

  const [sites, setSites] = useState<Site[]>([])
  const [categories, setCategories] = useState<CategoryResponse[]>([])
  const [isAddingSite, setIsAddingSite] = useState(false)
  const [addError, setAddError] = useMessageState<string | null>(null)
  const [newSiteName, setNewSiteName] = useState('')
  const [newCategoryId, setNewCategoryId] = useState('')
  const [newMaxCapacity, setNewMaxCapacity] = useState('10')
  const [newLocation, setNewLocation] = useState<MapPoint | null>(null)
  const [newPhotoUrls, setNewPhotoUrls] = useState<string[]>([])
  const [newPhotosUploading, setNewPhotosUploading] = useState(false)

  const [editingSiteId, setEditingSiteId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editCategoryId, setEditCategoryId] = useState('')
  const [editMaxCapacity, setEditMaxCapacity] = useState('')
  const [editLocation, setEditLocation] = useState<MapPoint | null>(null)
  const [editPhotoUrls, setEditPhotoUrls] = useState<string[]>([])
  const [editPhotosUploading, setEditPhotosUploading] = useState(false)
  const [isSavingSite, setIsSavingSite] = useState(false)
  const [editError, setEditError] = useMessageState<string | null>(null)
  const [sitesError, setSitesError] = useMessageState<string | null>(null)
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
          sitesApi.list({ zoneId: zoneId as string }).then((page) => page.content),
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
        if (!cancelled) setZoneError(() => describeApiError(cause))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [zoneId, reloadToken, setZoneError])

  function retry() {
    setIsLoading(true)
    setZoneError(null)
    setReloadToken((token) => token + 1)
  }

  async function handleSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()

    const trimmed = name.trim()
    if (trimmed === '') {
      setZoneError(() => t("Escribe el nombre de la zona."))
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
      setZoneSuccess(() => t("Nombre de la zona actualizado."))
    } catch (cause) {
      setZoneError(() => describeApiError(cause))
    } finally {
      setIsSavingZone(false)
    }
  }

  async function handleAddSite(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()

    if (zone === null) {
      return
    }

    if (newPhotosUploading) {
      setAddError(() => t("Espera a que terminen de subirse las fotos."))
      return
    }

    const trimmedName = newSiteName.trim()
    if (trimmedName === '') {
      setAddError(() => t("Escribe el nombre del sitio."))
      return
    }

    const latitude = newLocation?.latitude ?? null
    const longitude = newLocation?.longitude ?? null
    const coordinateError = validateCoordinates(latitude, longitude)
    if (coordinateError !== null || newLocation === null) {
      setAddError(() => validateCoordinates(latitude, longitude))
      return
    }

    if (newCategoryId === '') {
      setAddError(() => t("Selecciona la categoría del atractivo."))
      return
    }

    const capacity = Number(newMaxCapacity)
    if (!Number.isInteger(capacity) || capacity < 1) {
      setAddError(() => t("La capacidad debe ser un número entero mayor que cero."))
      return
    }

    setIsAddingSite(true)
    setAddError(null)

    try {
      const created = await sitesApi.create({
        zoneId: zone.id,
        name: trimmedName,
        categoryId: newCategoryId,
        latitude: newLocation.latitude,
        longitude: newLocation.longitude,
        maxCapacity: capacity,
        photoUrls: newPhotoUrls,
      })

      setSites((current) => [...current, created])
      setNewSiteName('')
      setNewLocation(null)
      setNewPhotoUrls([])
    } catch (cause) {
      setAddError(() => describeApiError(cause))
    } finally {
      setIsAddingSite(false)
    }
  }

  function startEditSite(site: Site) {
    setEditingSiteId(site.id)
    setEditName(site.name)
    setEditCategoryId(site.categoryId ?? '')
    setEditMaxCapacity(String(site.maxCapacity))
    setEditLocation({ latitude: site.latitude, longitude: site.longitude })
    setEditPhotoUrls([...site.photoUrls])
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
      setSitesError(() => describeApiError(cause))
    } finally {
      setStatusSiteId(null)
    }
  }

  async function saveSite(site: Site) {
    if (editPhotosUploading) {
      setEditError(() => t("Espera a que terminen de subirse las fotos."))
      return
    }

    const trimmedName = editName.trim()
    if (trimmedName === '') {
      setEditError(() => t("Escribe el nombre del sitio."))
      return
    }

    const latitude = editLocation?.latitude ?? null
    const longitude = editLocation?.longitude ?? null
    const coordinateError = validateCoordinates(latitude, longitude)
    if (coordinateError !== null || editLocation === null) {
      setEditError(() => validateCoordinates(latitude, longitude))
      return
    }

    if (editCategoryId === '') {
      setEditError(() => t("Selecciona la categoría del atractivo."))
      return
    }

    const capacity = Number(editMaxCapacity)
    if (!Number.isInteger(capacity) || capacity < 1) {
      setEditError(() => t("La capacidad debe ser un número entero mayor que cero."))
      return
    }

    setIsSavingSite(true)
    setEditError(null)

    try {
      const updated = await sitesApi.update(site.id, {
        name: trimmedName,
        categoryId: editCategoryId,
        zoneId: site.zoneId,
        latitude: editLocation.latitude,
        longitude: editLocation.longitude,
        maxCapacity: capacity,
        photoUrls: editPhotoUrls,
      })

      setSites((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      )
      setEditingSiteId(null)
    } catch (cause) {
      setEditError(() => describeApiError(cause))
    } finally {
      setIsSavingSite(false)
    }
  }

  if (isLoading) {
    return <Skeleton variant="text" count={4} label={t("Cargando zona…")} />
  }

  if (!isNew && zone === null) {
    return (
      <section>
        <Link to="/app/zonas" className={styles.back}>
          {t("← Volver a zonas")}</Link>
        <StateMessage
          title={t("No se pudo cargar la zona")}
          description={zoneError ?? t("No se encontró la zona.")}
          tone="error"
          action={<Button onClick={retry}>{t("Reintentar")}</Button>}
        />
      </section>
    )
  }

  return (
    <section>
      <Link to="/app/zonas" className={styles.back}>
        {t("← Volver a zonas")}</Link>

      <PageHeader
        breadcrumb={[
          { label: t("Zonas"), to: '/app/zonas' },
          ...(isNew || zone === null
            ? [{ label: t("Nueva zona") }]
            : [{ label: zone.name }]),
        ]}
        title={isNew ? t("Nueva zona turística") : t("Configurar zona turística")}
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
            <h2 className={styles.cardTitle}>{t("Información de la zona")}</h2>

            <Field
              label={t("Nombre de la zona")}
              placeholder={t("Ej: Centro Histórico")}
              required
              value={name}
              onChange={(changeEvent) => setName(changeEvent.target.value)}
            />

            <div className={styles.actions}>
              <Button variant="primary" type="submit" disabled={isSavingZone}>
                {isSavingZone
                  ? t("Guardando…")
                  : isNew
                    ? t("Crear zona")
                    : t("Guardar nombre")}
              </Button>
              <Link to="/app/zonas">
                <Button variant="outline">{t("Cancelar")}</Button>
              </Link>
            </div>
          </form>

          {zone !== null && (
            <article className={styles.card}>
              <h2 className={styles.cardTitle}>{t("Sitios de la zona")}</h2>

              <ul className={styles.siteList}>
                {sites.length === 0 && (
                  <li className={styles.helper}>
                    {t("Esta zona todavía no tiene sitios.")}</li>
                )}

                {sites.map((site) => (
                  <li key={site.id} className={styles.siteRow}>
                    {editingSiteId === site.id ? (
                      <div className={styles.siteForm}>
                        <Field
                          label={t("Nombre del sitio")}
                          required
                          value={editName}
                          onChange={(changeEvent) =>
                            setEditName(changeEvent.target.value)
                          }
                        />

                        <div className={`${styles.grid} ${styles.twoColumns}`}>
                          <SelectField
                            label={t("Categoría")}
                            required
                            value={editCategoryId}
                            options={[
                              { value: '', label: t("Selecciona una categoría") },
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
                            label={t("Capacidad máxima")}
                            type="number"
                            min={1}
                            required
                            value={editMaxCapacity}
                            onChange={(changeEvent) =>
                              setEditMaxCapacity(changeEvent.target.value)
                            }
                          />
                        </div>

                        <div className={styles.siteMediaGrid}>
                          <LocationPicker
                            key={site.id}
                            value={editLocation}
                            onChange={(point) => {
                              setEditLocation(point)
                              setEditError(null)
                            }}
                            defaultCenter={site}
                            disabled={isSavingSite}
                          />

                          <ImageUploader
                            label={t("Fotos del atractivo")}
                            folder="sm-xplore/sites"
                            value={editPhotoUrls}
                            onChange={setEditPhotoUrls}
                            onUploadingChange={setEditPhotosUploading}
                            hint={t("Las fotos se suben a Cloudinary. La primera será la portada.")}
                          />
                        </div>

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
                            disabled={isSavingSite || editPhotosUploading}
                            onClick={() => void saveSite(site)}
                          >
                            {isSavingSite ? t("Guardando…") : t("Guardar sitio")}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingSiteId(null)}
                          >
                            {t("Cancelar")}</Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className={styles.siteInfo}>
                          <p className={styles.siteTitle}>{site.name}</p>
                          <p className={styles.helper}>
                            {site.maxCapacity} {" "}{t("personas ·")}{' '}
                            {site.latitude.toFixed(5)},{' '}
                            {site.longitude.toFixed(5)} ·{' '}
                            {site.photoUrls.length}{' '}
                            {site.photoUrls.length === 1 ? t("foto") : t("fotos")}
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
                          {site.status === 'PUBLISHED' ? t("Despublicar") : t("Publicar")}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEditSite(site)}
                        >
                          {t("Editar")}</Button>
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
                <h3 className={styles.siteFormTitle}>{t("Añadir sitio")}</h3>

                <Field
                  label={t("Nombre del sitio o atractivo")}
                  placeholder={t("Ej: Catedral")}
                  required
                  value={newSiteName}
                  onChange={(changeEvent) =>
                    setNewSiteName(changeEvent.target.value)
                  }
                />

                <div className={`${styles.grid} ${styles.twoColumns}`}>
                  <SelectField
                    label={t("Categoría")}
                    required
                    hint={
                      categories.length === 0
                        ? t("No hay categorías de atractivos: pide a la gestora que cree una.")
                        : undefined
                    }
                    value={newCategoryId}
                    options={[
                      { value: '', label: t("Selecciona una categoría") },
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
                    label={t("Capacidad máxima")}
                    type="number"
                    min={1}
                    required
                    value={newMaxCapacity}
                    onChange={(changeEvent) =>
                      setNewMaxCapacity(changeEvent.target.value)
                    }
                  />
                </div>

                <div className={styles.siteMediaGrid}>
                  <LocationPicker
                    value={newLocation}
                    onChange={(point) => {
                      setNewLocation(point)
                      setAddError(null)
                    }}
                    defaultCenter={sites[0]}
                    disabled={isAddingSite}
                  />

                  <ImageUploader
                    label={t("Fotos del atractivo")}
                    folder="sm-xplore/sites"
                    value={newPhotoUrls}
                    onChange={setNewPhotoUrls}
                    onUploadingChange={setNewPhotosUploading}
                    hint={t("Las fotos se suben a Cloudinary. La primera será la portada.")}
                  />
                </div>

                {addError !== null && (
                  <p className={`${styles.feedback} ${styles.error}`} role="alert">
                    {addError}
                  </p>
                )}

                <div className={styles.actions}>
                  <Button
                    variant="outline"
                    type="submit"
                    disabled={isAddingSite || newPhotosUploading}
                  >
                    {isAddingSite ? t("Añadiendo…") : t("+ Añadir sitio")}
                  </Button>
                </div>
              </form>
            </article>
          )}
        </div>

        <div className={styles.column}>
          {zone !== null && (
            <article className={styles.card}>
              <h2 className={styles.cardTitle}>{t("Resumen")}</h2>
              <p className={styles.summaryLine}>
                <span className={styles.summaryLabel}>{t("Zona")}</span>
                {name.trim() === '' ? zone.name : name}
              </p>
              <p className={styles.summaryLine}>
                <span className={styles.summaryLabel}>{t("Sitios")}</span>
                {sites.length}
              </p>
            </article>
          )}
        </div>
      </div>
    </section>
  )
}

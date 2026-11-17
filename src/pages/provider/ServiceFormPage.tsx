import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMessageState } from '@/hooks/useMessageState'
import { translate as t } from '@/i18n/language'
import { useLanguage } from '@/hooks/useLanguage'
import { Button } from '@/components/Button'
import { Field } from '@/components/FormField'
import { ImageUploader } from '@/components/ImageUploader'
import { LocationPicker } from '@/components/LocationPicker'
import { coordinatePoint } from '@/components/MapPreview/mercator'
import type { MapPoint } from '@/components/MapPreview/mercator'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { SelectField } from '@/components/SelectField'
import { Skeleton } from '@/components/Skeleton'
import { StateMessage } from '@/components/StateMessage'
import { useAuth } from '@/hooks/useAuth'
import { serviceTypeLabel } from '@/config/roles'
import { categoriesApi } from '@/services/categoriesApi'
import { servicesApi } from '@/services/servicesApi'
import { sitesApi } from '@/services/sitesApi'
import { zonesApi } from '@/services/zonesApi'
import { describeApiError } from '@/utils/errors'
import type { CategoryResponse, Site, Zone } from '@/types'
import styles from './provider.module.css'

/** El backend guarda `type` como texto libre; estos son los que ofrece la UI. */
const SERVICE_TYPES = ['LODGING', 'TRANSPORT', 'FEEDING']

export default function ServiceFormPage() {
  useLanguage()
  const navigate = useNavigate()
  const { user } = useAuth()
  const profile = user?.role === 'SERVICE_PROVIDER' ? user.profile : null
  const providerLocation = coordinatePoint(profile?.latitude, profile?.longitude)
  const [locationMode, setLocationMode] = useState<'provider' | 'custom'>(() => providerLocation === null ? 'custom' : 'provider')
  const [customLocation, setCustomLocation] = useState<MapPoint | null>(null)
  const [locationError, setLocationError] = useMessageState<string | null>(null)
  const locationRef = useRef<HTMLFieldSetElement>(null)
  const locationHelpId = useId()
  const useProviderLocation = locationMode === 'provider' && providerLocation !== null
  const selectedLocation = useProviderLocation ? providerLocation : customLocation

  const [name, setName] = useState('')
  const [type, setType] = useState(SERVICE_TYPES[0])
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [maxCapacity, setMaxCapacity] = useState('')
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [photosUploading, setPhotosUploading] = useState(false)
  const [cancellationPolicy, setCancellationPolicy] = useState('')

  const [categories, setCategories] = useState<CategoryResponse[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [categoryId, setCategoryId] = useState('')
  const [zoneId, setZoneId] = useState('')
  const [siteId, setSiteId] = useState('')

  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState(true)
  const [catalogError, setCatalogError] = useMessageState<string | null>(null)
  const [error, setError] = useMessageState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  // El formulario necesita los tres catálogos para armar un servicio válido.
  useEffect(() => {
    let cancelled = false

    async function load() {
      setIsLoadingCatalogs(true)
      setCatalogError(null)

      try {
        const [categoryList, zoneList, siteList] = await Promise.all([
          categoriesApi.list('SERVICE'),
          zonesApi.list(),
          sitesApi.list().then((page) => page.content),
        ])

        if (!cancelled) {
          setCategories(categoryList.filter((category) => category.scope === 'SERVICE'))
          setZones(zoneList)
          setSites(siteList)
        }
      } catch (cause) {
        if (!cancelled) {
          setCatalogError(() => describeApiError(cause))
        }
      } finally {
        if (!cancelled) setIsLoadingCatalogs(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [reloadToken, setCatalogError])

  function retryCatalogs() {
    setIsLoadingCatalogs(true)
    setCatalogError(null)
    setReloadToken((token) => token + 1)
  }

  // Un sitio pertenece a una zona: al cambiar de zona se ofrece solo ese subconjunto.
  const siteOptions = sites.filter(
    (site) => zoneId === '' || site.zoneId === zoneId,
  )

  async function handleSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()

    if (photosUploading) {
      setError(() => t("Espera a que terminen de subirse las fotos."))
      return
    }

    const missing = () =>
      categoryId === ''
        ? t("la categoría")
        : zoneId === ''
          ? t("la zona")
          : siteId === ''
            ? t("el atractivo")
            : null

    if (missing() !== null) {
      setError(() => t("Selecciona {0}.", [missing()]))
      return
    }

    if (selectedLocation === null) {
      setLocationError(() => t("Selecciona la ubicación del servicio en el mapa."))
      locationRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      await servicesApi.create({
        name: name.trim(),
        description: description.trim() || undefined,
        type,
        categoryId,
        siteId,
        zoneId,
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        price: Number(price),
        maxCapacity: Number(maxCapacity),
        photosUrls: photoUrls.length > 0 ? photoUrls : undefined,
        cancellationPolicy: cancellationPolicy.trim() || undefined,
        // Un servicio nuevo sale publicado: sin esto nace en DRAFT y no aparece en el catálogo.
        status: 'PUBLISHED',
      })

      navigate('/app/mis-servicios')
    } catch (cause) {
      setError(() => describeApiError(cause))
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoadingCatalogs) {
    return <Skeleton variant="text" count={6} label={t("Cargando formulario…")} />
  }

  if (catalogError !== null) {
    return (
      <section>
        <Link to="/app/mis-servicios" className={styles.back}>
          {t("← Volver a mis servicios")}</Link>
        <StateMessage
          title={t("No se pudieron cargar los catálogos")}
          description={catalogError}
          tone="error"
          action={<Button onClick={retryCatalogs}>{t("Reintentar")}</Button>}
        />
      </section>
    )
  }

  return (
    <section>
      <Link to="/app/mis-servicios" className={styles.back}>
        {t("← Volver a mis servicios")}</Link>

      <PageHeader
        breadcrumb={[
          { label: t("Mis servicios"), to: '/app/mis-servicios' },
          { label: t("Nuevo servicio") },
        ]}
        title={t("Registrar servicio")}
        description={t("El servicio se publica en el catálogo apenas se crea.")}
      />

      {error !== null && (
        <p className={`${styles.feedback} ${styles.error}`} role="alert">
          {error}
        </p>
      )}

      <div className={styles.layout}>
        <form className={styles.card} onSubmit={handleSubmit} noValidate>
          <h2 className={styles.cardTitle}>{t("Información del servicio")}</h2>

          <div className={`${styles.grid} ${styles.twoColumns}`}>
            <Field
              label={t("Nombre del servicio")}
              placeholder={t("Ej: Alquiler de kayak")}
              required
              value={name}
              onChange={(changeEvent) => setName(changeEvent.target.value)}
            />

            <SelectField
              label={t("Tipo de servicio")}
              value={type}
              onChange={(changeEvent) => setType(changeEvent.target.value)}
              options={SERVICE_TYPES.map((value) => ({
                value,
                label: serviceTypeLabel(value),
              }))}
            />

            <SelectField
              label={t("Categoría")}
              required
              value={categoryId}
              onChange={(changeEvent) => setCategoryId(changeEvent.target.value)}
              options={[
                { value: '', label: t("Selecciona una categoría") },
                ...categories.map((category) => ({
                  value: category.id,
                  label: category.name,
                })),
              ]}
            />

            <SelectField
              label={t("Zona")}
              required
              value={zoneId}
              onChange={(changeEvent) => {
                setZoneId(changeEvent.target.value)
                setSiteId('')
              }}
              options={[
                { value: '', label: t("Selecciona una zona") },
                ...zones.map((zone) => ({ value: zone.id, label: zone.name })),
              ]}
            />

            <SelectField
              label={t("Atractivo mas cercano")}
              required
              hint={
                zoneId === ''
                  ? t("Elige primero una zona para acotar la lista.")
                  : undefined
              }
              value={siteId}
              onChange={(changeEvent) => setSiteId(changeEvent.target.value)}
              options={[
                { value: '', label: t("Selecciona un atractivo") },
                ...siteOptions.map((site) => ({
                  value: site.id,
                  label: site.name,
                })),
              ]}
            />

            <Field
              label={t("Precio por persona (COP)")}
              type="number"
              min={0}
              required
              value={price}
              onChange={(changeEvent) => setPrice(changeEvent.target.value)}
            />

            <Field
              label={t("Capacidad máxima")}
              type="number"
              min={1}
              required
              value={maxCapacity}
              onChange={(changeEvent) => setMaxCapacity(changeEvent.target.value)}
            />

            <fieldset className={`${styles.full} ${styles.locationGroup}`} ref={locationRef} disabled={isSaving}>
              <legend className={styles.names}>{t("Ubicación del servicio")}</legend>
              <label className={styles.locationOption}>
                <input
                  type="radio"
                  name="locationSource"
                  value="provider"
                  checked={useProviderLocation}
                  disabled={providerLocation === null}
                  aria-describedby={providerLocation === null ? locationHelpId : undefined}
                  onChange={() => {
                    setLocationMode('provider')
                    setLocationError(null)
                  }}
                />
                {t("Usar la misma ubicación de la prestadora")}
              </label>
              {providerLocation === null && (
                <p id={locationHelpId} className={styles.meta}>
                  {t("La prestadora no tiene una ubicación registrada. Escoge un punto en el mapa.")}
                </p>
              )}
              <label className={styles.locationOption}>
                <input
                  type="radio"
                  name="locationSource"
                  value="custom"
                  checked={!useProviderLocation}
                  onChange={() => {
                    setLocationMode('custom')
                    setLocationError(null)
                  }}
                />
                {t("Escoger una ubicación diferente")}
              </label>
              {!useProviderLocation && (
                <LocationPicker
                  label={t("Ubicación del servicio")}
                  value={customLocation}
                  defaultCenter={providerLocation ?? undefined}
                  onChange={(point) => {
                    setCustomLocation(point)
                    setLocationError(null)
                  }}
                  disabled={isSaving}
                  error={locationError ?? undefined}
                />
              )}
            </fieldset>

            <div className={styles.cancellationPolicy}>
              <Field
                label={t("Política de cancelación")}
                placeholder={t("Cancelación gratuita hasta 24 h antes")}
                value={cancellationPolicy}
                onChange={(changeEvent) =>
                  setCancellationPolicy(changeEvent.target.value)
                }
              />
            </div>

            <label className={styles.full}>
              <span className={styles.names}>{t("Descripción")}</span>
              <textarea
                className={styles.textarea}
                value={description}
                onChange={(changeEvent) => setDescription(changeEvent.target.value)}
              />
            </label>

            <ImageUploader
              className={styles.full}
              label={t("Fotos del servicio")}
              folder="sm-xplore/services"
              value={photoUrls}
              onChange={setPhotoUrls}
              onUploadingChange={setPhotosUploading}
              hint={t("Se suben a Cloudinary y se guardan como URLs del servicio. La primera será la portada.")}
            />
          </div>

          <div className={styles.actions}>
            <Button
              variant="accent"
              size="lg"
              type="submit"
              disabled={isSaving || photosUploading}
            >
              {isSaving ? t("Guardando…") : t("Crear servicio")}
            </Button>
            <Link to="/app/mis-servicios">
              <Button variant="outline" size="lg">
                {t("Cancelar")}</Button>
            </Link>
          </div>
        </form>

        <div className={styles.column}>
          <article className={styles.card}>
            <h2 className={styles.cardTitle}>{t("Cómo funciona")}</h2>
            <p className={styles.meta}>
              {t("El servicio se publica al crearse. Para ocultarlo del catálogo, cámbialo a inactivo desde «Gestionar».")}</p>
          </article>
        </div>
      </div>
    </section>
  )
}

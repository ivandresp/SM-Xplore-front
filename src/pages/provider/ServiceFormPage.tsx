import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/Button'
import { Field, SelectField } from '@/components/FormField'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { Skeleton } from '@/components/Skeleton'
import { StateMessage } from '@/components/StateMessage'
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
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [type, setType] = useState(SERVICE_TYPES[0])
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [maxCapacity, setMaxCapacity] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [photos, setPhotos] = useState('')
  const [cancellationPolicy, setCancellationPolicy] = useState('')

  const [categories, setCategories] = useState<CategoryResponse[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [categoryId, setCategoryId] = useState('')
  const [zoneId, setZoneId] = useState('')
  const [siteId, setSiteId] = useState('')

  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingCatalogs, setIsLoadingCatalogs] = useState(true)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  // El formulario necesita los tres catálogos para armar un servicio válido.
  useEffect(() => {
    let cancelled = false

    async function load() {
      setIsLoadingCatalogs(true)
      setCatalogError(null)

      try {
        const [categoryList, zoneList, siteList] = await Promise.all([
          categoriesApi.list(),
          zonesApi.list(),
          sitesApi.list(),
        ])

        if (!cancelled) {
          setCategories(categoryList)
          setZones(zoneList)
          setSites(siteList)
        }
      } catch (cause) {
        if (!cancelled) {
          setCatalogError(describeApiError(cause))
        }
      } finally {
        if (!cancelled) setIsLoadingCatalogs(false)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [reloadToken])

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

    const missing =
      categoryId === ''
        ? 'la categoría'
        : zoneId === ''
          ? 'la zona'
          : siteId === ''
            ? 'el atractivo'
            : null

    if (missing !== null) {
      setError(`Selecciona ${missing}: el backend lo exige.`)
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const photosUrls = photos
        .split('\n')
        .map((url) => url.trim())
        .filter((url) => url !== '')

      await servicesApi.create({
        name: name.trim(),
        description: description.trim() || undefined,
        type,
        categoryId,
        siteId,
        zoneId,
        latitude: Number(latitude),
        longitude: Number(longitude),
        price: Number(price),
        maxCapacity: Number(maxCapacity),
        photosUrls: photosUrls.length > 0 ? photosUrls : undefined,
        cancellationPolicy: cancellationPolicy.trim() || undefined,
        // Un servicio nuevo sale publicado: sin esto nace en DRAFT y no aparece en el catálogo.
        status: 'PUBLISHED',
      })

      navigate('/app/mis-servicios')
    } catch (cause) {
      setError(describeApiError(cause))
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoadingCatalogs) {
    return <Skeleton variant="text" count={6} label="Cargando formulario…" />
  }

  if (catalogError !== null) {
    return (
      <section>
        <Link to="/app/mis-servicios" className={styles.back}>
          ← Volver a mis servicios
        </Link>
        <StateMessage
          title="No se pudieron cargar los catálogos"
          description={catalogError}
          tone="error"
          action={<Button onClick={retryCatalogs}>Reintentar</Button>}
        />
      </section>
    )
  }

  return (
    <section>
      <Link to="/app/mis-servicios" className={styles.back}>
        ← Volver a mis servicios
      </Link>

      <PageHeader
        breadcrumb={[
          { label: 'Mis servicios', to: '/app/mis-servicios' },
          { label: 'Nuevo servicio' },
        ]}
        title="Registrar servicio"
        description="El servicio se publica en el catálogo apenas se crea."
      />

      {error !== null && (
        <p className={`${styles.feedback} ${styles.error}`} role="alert">
          {error}
        </p>
      )}

      <div className={styles.layout}>
        <form className={styles.card} onSubmit={handleSubmit} noValidate>
          <h2 className={styles.cardTitle}>Información del servicio</h2>

          <div className={`${styles.grid} ${styles.twoColumns}`}>
            <Field
              label="Nombre del servicio"
              placeholder="Ej: Alquiler de kayak"
              required
              value={name}
              onChange={(changeEvent) => setName(changeEvent.target.value)}
            />

            <SelectField
              label="Tipo de servicio"
              value={type}
              onChange={(changeEvent) => setType(changeEvent.target.value)}
              options={SERVICE_TYPES.map((value) => ({
                value,
                label: serviceTypeLabel(value),
              }))}
            />

            <SelectField
              label="Categoría"
              required
              value={categoryId}
              onChange={(changeEvent) => setCategoryId(changeEvent.target.value)}
              options={[
                { value: '', label: 'Selecciona una categoría' },
                ...categories.map((category) => ({
                  value: category.id,
                  label: category.name,
                })),
              ]}
            />

            <SelectField
              label="Zona"
              required
              value={zoneId}
              onChange={(changeEvent) => {
                setZoneId(changeEvent.target.value)
                setSiteId('')
              }}
              options={[
                { value: '', label: 'Selecciona una zona' },
                ...zones.map((zone) => ({ value: zone.id, label: zone.name })),
              ]}
            />

            <SelectField
              label="Atractivo"
              required
              hint={
                zoneId === ''
                  ? 'Elige primero una zona para acotar la lista.'
                  : undefined
              }
              value={siteId}
              onChange={(changeEvent) => setSiteId(changeEvent.target.value)}
              options={[
                { value: '', label: 'Selecciona un atractivo' },
                ...siteOptions.map((site) => ({
                  value: site.id,
                  label: site.name,
                })),
              ]}
            />

            <Field
              label="Precio por persona (COP)"
              type="number"
              min={0}
              required
              value={price}
              onChange={(changeEvent) => setPrice(changeEvent.target.value)}
            />

            <Field
              label="Capacidad máxima"
              type="number"
              min={1}
              required
              value={maxCapacity}
              onChange={(changeEvent) => setMaxCapacity(changeEvent.target.value)}
            />

            <Field
              label="Latitud"
              inputMode="decimal"
              placeholder="11.2404"
              required
              value={latitude}
              onChange={(changeEvent) => setLatitude(changeEvent.target.value)}
            />

            <Field
              label="Longitud"
              inputMode="decimal"
              placeholder="-74.1990"
              required
              value={longitude}
              onChange={(changeEvent) => setLongitude(changeEvent.target.value)}
            />

            <Field
              label="Política de cancelación"
              placeholder="Cancelación gratuita hasta 24 h antes"
              value={cancellationPolicy}
              onChange={(changeEvent) =>
                setCancellationPolicy(changeEvent.target.value)
              }
            />

            <label className={styles.full}>
              <span className={styles.names}>Descripción</span>
              <textarea
                className={styles.textarea}
                value={description}
                onChange={(changeEvent) => setDescription(changeEvent.target.value)}
              />
            </label>

            <label className={styles.full}>
              <span className={styles.names}>Fotos (una URL por línea)</span>
              <textarea
                className={styles.textarea}
                placeholder={'https://…/foto-1.jpg\nhttps://…/foto-2.jpg'}
                value={photos}
                onChange={(changeEvent) => setPhotos(changeEvent.target.value)}
              />
              <span className={styles.helper}>
                El backend no sube archivos: solo guarda URLs.
              </span>
            </label>
          </div>

          <div className={styles.actions}>
            <Button variant="accent" size="lg" type="submit" disabled={isSaving}>
              {isSaving ? 'Guardando…' : 'Crear servicio'}
            </Button>
            <Link to="/app/mis-servicios">
              <Button variant="outline" size="lg">
                Cancelar
              </Button>
            </Link>
          </div>
        </form>

        <div className={styles.column}>
          <article className={styles.card}>
            <h2 className={styles.cardTitle}>Cómo funciona</h2>
            <p className={styles.meta}>
              El servicio se publica al crearse. Para ocultarlo del catálogo,
              cámbialo a inactivo desde «Gestionar».
            </p>
          </article>
        </div>
      </div>
    </section>
  )
}

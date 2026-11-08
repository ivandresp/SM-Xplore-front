import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/Button'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { Pagination } from '@/components/Pagination/Pagination'
import { SiteCard } from '@/components/SiteCard/SiteCard'
import { Skeleton } from '@/components/Skeleton'
import { StateMessage } from '@/components/StateMessage'
import { sitesApi } from '@/services/sitesApi'
import { zonesApi } from '@/services/zonesApi'
import { describeApiError } from '@/utils/errors'
import type { Site, Zone } from '@/types'
import styles from './catalog.module.css'

const PAGE_SIZE = 12

/** Catálogo público de atractivos (sitios). Sin mockup: sigue el patrón de Explorar. */
export default function SiteListPage() {
  const [sites, setSites] = useState<Site[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [term, setTerm] = useState('')
  const [zoneId, setZoneId] = useState('')
  const [page, setPage] = useState(1)
  /** Cambia de valor para forzar una recarga (botón "Reintentar"). */
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function run() {
      try {
        const [sitesResult, zonesResult] = await Promise.allSettled([
          sitesApi.list().then((page) => page.content),
          zonesApi.list(),
        ])

        if (sitesResult.status === 'rejected') {
          throw sitesResult.reason
        }

        if (!cancelled) {
          setSites(sitesResult.value)
          setZones(zonesResult.status === 'fulfilled' ? zonesResult.value : [])
          setError(null)
        }
      } catch (cause) {
        if (!cancelled) {
          setSites([])
          setError(describeApiError(cause))
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [reloadToken])

  function retry() {
    setIsLoading(true)
    setError(null)
    setReloadToken((current) => current + 1)
  }

  const zoneOptions = useMemo(
    () => [...zones].sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [zones],
  )

  const zoneNameById = useMemo(
    () => new Map(zones.map((zone) => [zone.id, zone.name])),
    [zones],
  )

  const filtered = useMemo(() => {
    const needle = term.trim().toLowerCase()

    return sites
      .filter((site) => {
        if (zoneId !== '' && site.zoneId !== zoneId) {
          return false
        }

        if (needle === '') {
          return true
        }

        const zoneName = zoneNameById.get(site.zoneId) ?? ''
        return (
          site.name.toLowerCase().includes(needle) ||
          zoneName.toLowerCase().includes(needle)
        )
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'es'))
  }, [sites, term, zoneId, zoneNameById])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className={styles.page}>
      <PageHeader
        serif
        title="Atractivos turísticos de Santa Marta"
        meta={`${filtered.length} ${filtered.length === 1 ? 'atractivo' : 'atractivos'}`}
      />

      {error !== null && (
        <StateMessage
          tone="error"
          title="No pudimos cargar los atractivos"
          description={error}
          action={
            <Button variant="accent" onClick={retry}>
              Reintentar
            </Button>
          }
        />
      )}

      <div className={styles.toolbar}>
        <label className={`${styles.field} ${styles.toolbarField}`}>
          <span className={styles.fieldLabel}>Buscar atractivo</span>
          <input
            className={styles.control}
            type="search"
            placeholder="Nombre o zona…"
            value={term}
            onChange={(event) => {
              setTerm(event.target.value)
              setPage(1)
            }}
          />
        </label>

        <label className={`${styles.field} ${styles.toolbarField}`}>
          <span className={styles.fieldLabel}>Zona</span>
          <select
            className={styles.control}
            value={zoneId}
            disabled={zoneOptions.length === 0}
            onChange={(event) => {
              setZoneId(event.target.value)
              setPage(1)
            }}
          >
            <option value="">Todas las zonas</option>
            {zoneOptions.map((zone) => (
              <option key={zone.id} value={zone.id}>
                {zone.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isLoading && (
        <Skeleton variant="card" count={6} label="Cargando atractivos…" />
      )}

      {!isLoading && !error && filtered.length === 0 && (
        <StateMessage
          title={
            term !== '' || zoneId !== ''
              ? 'No encontramos atractivos con esos filtros'
              : 'Todavía no hay atractivos publicados'
          }
          description={
            term !== '' || zoneId !== ''
              ? 'Prueba con otro nombre o cambia de zona.'
              : 'Cuando las gestoras registren sitios en sus zonas aparecerán aquí.'
          }
          action={
            term !== '' || zoneId !== '' ? (
              <Button
                variant="outline"
                onClick={() => {
                  setTerm('')
                  setZoneId('')
                  setPage(1)
                }}
              >
                Limpiar filtros
              </Button>
            ) : undefined
          }
        />
      )}

      {visible.length > 0 && (
        <div className={styles.cards}>
          {visible.map((site) => (
            <SiteCard
              key={site.id}
              site={site}
              zoneName={zoneNameById.get(site.zoneId)}
            />
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/Button'
import { DataTable } from '@/components/DataTable/DataTable'
import type { Column } from '@/components/DataTable/DataTable'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { SearchInput } from '@/components/SearchInput/SearchInput'
import { StateMessage } from '@/components/StateMessage'
import { sitesApi } from '@/services/sitesApi'
import { zonesApi } from '@/services/zonesApi'
import { describeApiError } from '@/utils/errors'
import type { Site, Zone } from '@/types'
import styles from './zones.module.css'
import tableStyles from '@/pages/admin/admin.module.css'

interface ZoneRow {
  zone: Zone
  sites: Site[]
}

/** Wireframe: 11-gestionar-destino-frame-115-1326 · Zonas turísticas (listado). */
export default function ZonesListPage() {
  const [zones, setZones] = useState<Zone[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [term, setTerm] = useState('')
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function run() {
      setIsLoading(true)
      setError(null)

      try {
        const [zoneList, siteList] = await Promise.all([
          zonesApi.list(),
          sitesApi.list(),
        ])

        if (!cancelled) {
          setZones(zoneList)
          setSites(siteList)
          setError(null)
        }
      } catch (cause) {
        if (!cancelled) setError(describeApiError(cause))
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
    setError(null)
    setReloadToken((token) => token + 1)
  }

  const filtered = useMemo(() => {
    const needle = term.trim().toLowerCase()

    return zones.filter(
      (zone) => needle === '' || zone.name.toLowerCase().includes(needle),
    )
  }, [zones, term])

  const rows: ZoneRow[] = useMemo(
    () =>
      filtered.map((zone) => ({
        zone,
        sites: sites.filter((site) => site.zoneId === zone.id),
      })),
    [filtered, sites],
  )

  const withoutSites = useMemo(() => {
    const zonesWithSites = new Set(sites.map((site) => site.zoneId))
    return zones.filter((zone) => !zonesWithSites.has(zone.id)).length
  }, [zones, sites])

  const columns: Column<ZoneRow>[] = [
    {
      header: 'Zona',
      render: ({ zone, sites: zoneSites }) => (
        <div>
          <p className={tableStyles.userName}>{zone.name}</p>
          <p className={tableStyles.userEmail}>
            {zoneSites.length}{' '}
            {zoneSites.length === 1 ? 'sitio' : 'sitios'}
          </p>
        </div>
      ),
    },
    {
      header: 'Sitios',
      render: ({ sites: zoneSites }) =>
        zoneSites.length === 0 ? (
          <span className={styles.muted}>Sin sitios todavía</span>
        ) : (
          <div className={styles.siteNames}>
            {zoneSites.map((site) => (
              <span key={site.id} className={styles.siteName}>
                {site.name}
              </span>
            ))}
          </div>
        ),
    },
    {
      header: 'Acciones',
      align: 'right',
      render: ({ zone }) => (
        <Link to={`/app/zonas/${zone.id}`}>
          <Button variant="outline" size="sm">
            Configurar
          </Button>
        </Link>
      ),
    },
  ]

  return (
    <section>
      <PageHeader
        breadcrumb={[{ label: 'Zonas' }, { label: 'Listado' }]}
        title="Zonas turísticas"
        description="Una zona agrupa varios sitios o atractivos. Zona ≠ sitio."
        actions={
          <div className={tableStyles.search}>
            <SearchInput
              label="Buscar zona por nombre"
              placeholder="Buscar zona por nombre…"
              value={term}
              onChange={setTerm}
            />
          </div>
        }
      />

      {error !== null ? (
        <StateMessage
          title="No se pudieron cargar las zonas"
          description={error}
          tone="error"
          action={<Button onClick={retry}>Reintentar</Button>}
        />
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.zone.id}
          isLoading={isLoading}
          loadingMessage="Cargando zonas…"
          emptyMessage="No hay zonas con estos filtros."
          emptyAction={
            <Link to="/app/zonas/nueva">
              <Button variant="primary">+ Nueva zona</Button>
            </Link>
          }
        />
      )}

      {!isLoading && error === null && withoutSites > 0 && (
        <p className={styles.helper}>
          {withoutSites === 1
            ? '1 zona aún no tiene sitios: ábrela para añadirlos.'
            : `${withoutSites} zonas aún no tienen sitios: ábrelas para añadirlos.`}
        </p>
      )}

      <div className={styles.actions}>
        <Link to="/app/zonas/nueva">
          <Button variant="primary">+ Nueva zona</Button>
        </Link>
      </div>

      <p className={styles.notice}>
        Datos reales de <code>/zones</code> y <code>/sites</code>: la zona solo
        guarda su nombre y cada sitio pertenece a una zona con coordenadas y
        fotos por URL. La capacidad recomendada, el umbral de congestión, el
        estado y la afluencia del diseño todavía no existen en la API.
      </p>
    </section>
  )
}

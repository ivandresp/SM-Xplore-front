import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiErrorAction } from '@/components/ApiErrorAction'
import { useApiErrorState } from '@/hooks/useApiErrorState'
import { translate as t } from '@/i18n/language'
import { useLanguage } from '@/hooks/useLanguage'
import { Button } from '@/components/Button'
import { DataTable } from '@/components/DataTable/DataTable'
import type { Column } from '@/components/DataTable/DataTable'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { SearchInput } from '@/components/SearchInput/SearchInput'
import { StateMessage } from '@/components/StateMessage'
import { sitesApi } from '@/services/sitesApi'
import { zonesApi } from '@/services/zonesApi'
import type { Site, Zone } from '@/types'
import styles from './zones.module.css'
import tableStyles from '@/pages/admin/admin.module.css'

interface ZoneRow {
  zone: Zone
  sites: Site[]
}

/** Wireframe: 11-gestionar-destino-frame-115-1326 · Zonas turísticas (listado). */
export default function ZonesListPage() {
  useLanguage()
  const [zones, setZones] = useState<Zone[]>([])
  const [sites, setSites] = useState<Site[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError, errorCause, setErrorFromApi] = useApiErrorState()
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
          sitesApi.list().then((page) => page.content),
        ])

        if (!cancelled) {
          setZones(zoneList)
          setSites(siteList)
          setError(null)
        }
      } catch (cause) {
        if (!cancelled) setErrorFromApi(cause)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [reloadToken, setError, setErrorFromApi])

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

  const rows: ZoneRow[] = useMemo(() => {
    const byZone = new Map<string, Site[]>()

    for (const site of sites) {
      const bucket = byZone.get(site.zoneId)
      if (bucket === undefined) {
        byZone.set(site.zoneId, [site])
      } else {
        bucket.push(site)
      }
    }

    return filtered.map((zone) => ({ zone, sites: byZone.get(zone.id) ?? [] }))
  }, [filtered, sites])

  const withoutSites = useMemo(() => {
    const zonesWithSites = new Set(sites.map((site) => site.zoneId))
    return zones.filter((zone) => !zonesWithSites.has(zone.id)).length
  }, [zones, sites])

  const columns: Column<ZoneRow>[] = [
    {
      header: t("Zona"),
      render: ({ zone, sites: zoneSites }) => (
        <div>
          <p className={tableStyles.userName}>{zone.name}</p>
          <p className={tableStyles.userEmail}>
            {zoneSites.length}{' '}
            {zoneSites.length === 1 ? t("sitio") : t("sitios")}
          </p>
        </div>
      ),
    },
    {
      header: t("Sitios"),
      render: ({ sites: zoneSites }) =>
        zoneSites.length === 0 ? (
          <span className={styles.muted}>{t("Sin sitios todavía")}</span>
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
      header: t("Acciones"),
      align: 'right',
      render: ({ zone }) => (
        <Link to={`/app/zonas/${zone.id}`}>
          <Button variant="outline" size="sm">
            {t("Configurar")}</Button>
        </Link>
      ),
    },
  ]

  return (
    <section>
      <PageHeader
        breadcrumb={[{ label: t("Zonas") }, { label: t("Listado") }]}
        title={t("Zonas turísticas")}
        description={t("Una zona agrupa varios sitios o atractivos. Zona ≠ sitio.")}
        actions={
          <div className={tableStyles.search}>
            <SearchInput
              label={t("Buscar zona por nombre")}
              placeholder={t("Buscar zona por nombre…")}
              value={term}
              onChange={setTerm}
            />
          </div>
        }
      />

      {error !== null ? (
        <StateMessage
          title={t("No se pudieron cargar las zonas")}
          description={error}
          tone="error"
          action={<ApiErrorAction error={errorCause} onRetry={retry} />}
        />
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.zone.id}
          isLoading={isLoading}
          loadingMessage={t("Cargando zonas…")}
          emptyMessage={t("No hay zonas con estos filtros.")}
          emptyAction={
            <Link to="/app/zonas/nueva">
              <Button variant="primary">{t("+ Nueva zona")}</Button>
            </Link>
          }
        />
      )}

      {!isLoading && error === null && withoutSites > 0 && (
        <p className={styles.helper}>
          {withoutSites === 1
            ? t("1 zona aún no tiene sitios: ábrela para añadirlos.")
            : t("{0} zonas aún no tienen sitios: ábrelas para añadirlos.", [withoutSites])}
        </p>
      )}

      <div className={styles.actions}>
        <Link to="/app/zonas/nueva">
          <Button variant="primary">{t("+ Nueva zona")}</Button>
        </Link>
      </div>

      <p className={styles.notice}>
        {t("Cada zona agrupa sus atractivos; el atractivo guarda nombre, coordenadas y fotos. La zona solo tiene nombre.")}</p>
    </section>
  )
}

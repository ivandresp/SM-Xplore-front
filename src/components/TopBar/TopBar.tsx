import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Logo } from '@/components/Logo'
import { Skeleton } from '@/components/Skeleton'
import {
  MIN_SEARCH_LENGTH,
  groupHref,
  normalizeSearchTerm,
  useGlobalSearch,
} from '@/hooks/useGlobalSearch'
import type { GlobalSearchGroup } from '@/hooks/useGlobalSearch'
import { classNames } from '@/utils/format'
import styles from './TopBar.module.css'

export interface TopBarLink {
  to: string
  label: string
}

export interface TopBarProps {
  /** `light` para páginas públicas, `dark` para las barras navy. */
  tone?: 'light' | 'dark'
  /** Muestra el buscador global. */
  search?: boolean
  /** Píldora junto al logo (p. ej. "Panel de gestión"). */
  badge?: string
  links?: TopBarLink[]
  /** Acciones del extremo derecho (botón, avatar, menú…). */
  right?: ReactNode
}

const SEARCH_GROUPS: Array<{ key: GlobalSearchGroup; label: string }> = [
  { key: 'activities', label: 'Actividades' },
  { key: 'events', label: 'Eventos' },
  { key: 'sites', label: 'Atractivos' },
  { key: 'services', label: 'Servicios' },
]

/** Buscador global: panel con los resultados agrupados por tipo. */
function GlobalSearch() {
  const { term, setTerm, isLoading, results, error, failed, retry } =
    useGlobalSearch()
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelId = useId()
  const navigate = useNavigate()

  const showPanel =
    open && normalizeSearchTerm(term).length >= MIN_SEARCH_LENGTH
  const items = SEARCH_GROUPS.flatMap((group) => results[group.key].items)
  const failedLabels = SEARCH_GROUPS.filter((group) =>
    failed.includes(group.key),
  ).map((group) => group.label)

  useEffect(() => {
    if (!open) {
      return
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        wrapperRef.current?.contains(event.target) !== true
      ) {
        setOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)

    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      setOpen(false)
      inputRef.current?.focus()
      return
    }

    if (!showPanel) {
      return
    }

    if (event.key === 'Enter' && document.activeElement === inputRef.current) {
      const first = items[0]
      if (first !== undefined) {
        event.preventDefault()
        setOpen(false)
        navigate(first.to)
      }
      return
    }

    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
      return
    }

    const links = Array.from(
      wrapperRef.current?.querySelectorAll<HTMLAnchorElement>(
        'a[data-search-result]',
      ) ?? [],
    )

    if (links.length === 0) {
      return
    }

    event.preventDefault()
    const step = event.key === 'ArrowDown' ? 1 : -1
    const current = links.findIndex((link) => link === document.activeElement)
    const next =
      current === -1
        ? step === 1
          ? 0
          : links.length - 1
        : (current + step + links.length) % links.length

    links[next]?.focus()
  }

  return (
    <div
      ref={wrapperRef}
      className={styles.searchWrap}
      role="search"
      onKeyDown={handleKeyDown}
    >
      <div className={styles.search}>
        <svg
          className={styles.searchIcon}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="M16.5 16.5 21 21" />
        </svg>
        <input
          ref={inputRef}
          type="search"
          name="term"
          value={term}
          onChange={(event) => {
            setTerm(event.target.value)
            setOpen(true)
          }}
          onClick={() => setOpen(true)}
          placeholder="Buscar actividades, atractivos, eventos…"
          role="combobox"
          aria-label="Buscar en el catálogo"
          aria-autocomplete="list"
          aria-expanded={showPanel}
          autoComplete="off"
        />
      </div>

      {showPanel && (
        <div
          id={panelId}
          className={styles.panel}
          role="group"
          aria-label="Resultados de la búsqueda"
        >
          {isLoading ? (
            <div className={styles.panelBody}>
              <Skeleton variant="text" count={3} label="Buscando" />
            </div>
          ) : error !== null ? (
            <div className={styles.panelBody} role="alert">
              <p className={styles.panelText}>{error}</p>
              <button type="button" className={styles.retry} onClick={retry}>
                Reintentar
              </button>
            </div>
          ) : (
            <div className={styles.panelBody}>
              {failedLabels.length > 0 && (
                <p className={styles.panelNote}>
                  No se pudo buscar en: {failedLabels.join(', ')}.
                </p>
              )}

              {items.length === 0 ? (
                <p className={styles.panelText}>
                  No encontramos nada para «{term.trim()}»
                </p>
              ) : (
                SEARCH_GROUPS.map((group) => {
                  const { items: groupItems, total } = results[group.key]

                  if (groupItems.length === 0) {
                    return null
                  }

                  return (
                    <section key={group.key} className={styles.group}>
                      <p className={styles.groupTitle}>{group.label}</p>
                      <ul className={styles.groupList}>
                        {groupItems.map((item) => (
                          <li key={item.id}>
                            <Link
                              data-search-result
                              to={item.to}
                              className={styles.result}
                              onClick={() => setOpen(false)}
                            >
                              <span className={styles.resultName}>
                                {item.name}
                              </span>
                              <span className={styles.resultMeta}>
                                {item.subtitle}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                      <Link
                        className={styles.seeAll}
                        to={groupHref(group.key, term)}
                        onClick={() => setOpen(false)}
                      >
                        {total > groupItems.length
                          ? `Ver los ${total} resultados`
                          : `Ver todos en ${group.label}`}
                      </Link>
                    </section>
                  )
                })
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function TopBar({
  tone = 'light',
  search = false,
  badge,
  links = [],
  right,
}: TopBarProps) {
  return (
    <header className={classNames(styles.bar, tone === 'dark' && styles.dark)}>
      <Link to="/" aria-label="SM-Xplore, ir al inicio">
        <Logo tone={tone === 'dark' ? 'inverse' : 'default'} />
      </Link>

      {badge !== undefined && <span className={styles.badge}>{badge}</span>}

      {search && <GlobalSearch />}

      {links.length > 0 && (
        <nav className={styles.links}>
          {links.map((link) => (
            <Link key={link.label} to={link.to} className={styles.link}>
              {link.label}
            </Link>
          ))}
        </nav>
      )}

      {right !== undefined && <div className={styles.right}>{right}</div>}
    </header>
  )
}

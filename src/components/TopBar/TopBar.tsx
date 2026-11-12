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
  /** Rutas que también activan el enlace (p. ej. `/actividades` para `/explorar`). */
  aliases?: string[]
}

export interface TopBarProps {
  /** `light` para páginas públicas, `dark` para las barras navy. */
  tone?: 'light' | 'dark'
  /** Muestra el buscador global. */
  search?: boolean
  /** Píldora junto al logo (p. ej. "Panel de gestión"). */
  badge?: string
  /** Navegación visible desde 900 px. */
  links?: TopBarLink[]
  /**
   * Navegación del menú móvil. Por defecto son los mismos `links`; el panel
   * del rol la usa para no duplicar la barra lateral en pantallas estrechas.
   */
  menuLinks?: TopBarLink[]
  /** Ruta actual: marca el enlace activo con `aria-current="page"`. */
  currentPath?: string
  /** Acciones del extremo derecho (botón, avatar, menú…). */
  right?: ReactNode
}

/** Mismo corte que TopBar.module.css: desde aquí manda la barra lateral. */
const DESKTOP_QUERY = '(min-width: 900px)'

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

/** Activo si la ruta coincide exacta o es una subruta suya. */
function isCurrentPath(pathname: string, to: string): boolean {
  return pathname === to || pathname.startsWith(`${to}/`)
}

function matchesLink(pathname: string, link: TopBarLink): boolean {
  return [link.to, ...(link.aliases ?? [])].some((path) =>
    isCurrentPath(pathname, path),
  )
}

function linkIsCurrent(pathname: string | undefined, link: TopBarLink): 'page' | undefined {
  return pathname !== undefined && matchesLink(pathname, link) ? 'page' : undefined
}

export function TopBar({
  tone = 'light',
  search = false,
  badge,
  links = [],
  menuLinks,
  currentPath,
  right,
}: TopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuId = useId()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const items = menuLinks ?? links
  const hasMenu = items.length > 0

  // Atrás/adelante del navegador cambian la ruta por debajo del menú abierto.
  useEffect(() => {
    function handlePopState() {
      setMenuOpen(false)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  /*
   * Al cruzar a escritorio (p. ej. girar una tableta de 768 a 1024) el botón y
   * el panel se ocultan por CSS: si el menú estaba abierto se cerraría solo de
   * forma visual, dejando aria-expanded=true sin panel. Se cierra de verdad.
   */
  useEffect(() => {
    if (!menuOpen || typeof window.matchMedia !== 'function') {
      return
    }

    const query = window.matchMedia(DESKTOP_QUERY)
    function handleChange(event: MediaQueryListEvent) {
      if (event.matches) {
        setMenuOpen(false)
      }
    }

    query.addEventListener('change', handleChange)
    return () => query.removeEventListener('change', handleChange)
  }, [menuOpen])

  useEffect(() => {
    if (!menuOpen) {
      return
    }

    // El foco entra en el menú; el botón lo recupera al cerrar con Esc.
    panelRef.current?.querySelector<HTMLAnchorElement>('a')?.focus()

    function handlePointerDown(event: PointerEvent) {
      if (!(event.target instanceof Node)) {
        return
      }

      if (
        panelRef.current?.contains(event.target) === true ||
        buttonRef.current?.contains(event.target) === true
      ) {
        return
      }

      setMenuOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [menuOpen])

  function closeMenu(returnFocus = false) {
    setMenuOpen(false)
    if (returnFocus) {
      buttonRef.current?.focus()
    }
  }

  /** Esc cierra y devuelve el foco; Tab queda dentro del panel desplegado. */
  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.stopPropagation()
      closeMenu(true)
      return
    }

    if (event.key !== 'Tab') {
      return
    }

    const focusables = Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>('a[href]') ?? [],
    )
    const first = focusables[0]
    const last = focusables[focusables.length - 1]

    if (first === undefined || last === undefined) {
      return
    }

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <header className={classNames(styles.bar, tone === 'dark' && styles.dark)}>
      <Link
        to="/"
        aria-label="SM-Xplore, ir al inicio"
        className={styles.logoLink}
      >
        <Logo tone={tone === 'dark' ? 'inverse' : 'default'} />
      </Link>

      {badge !== undefined && <span className={styles.badge}>{badge}</span>}

      {search && <GlobalSearch />}

      {links.length > 0 && (
        <nav className={styles.links} aria-label="Navegación principal">
          {links.map((link) => (
            <Link
              key={link.label}
              to={link.to}
              className={styles.link}
              aria-current={linkIsCurrent(currentPath, link)}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}

      {hasMenu && (
        <button
          ref={buttonRef}
          type="button"
          className={styles.menuButton}
          aria-expanded={menuOpen}
          /* Cerrado no hay panel: no se apunta a un id inexistente. */
          aria-controls={menuOpen ? menuId : undefined}
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className={styles.menuIcon} aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span className={styles.menuText}>Menú</span>
        </button>
      )}

      {right !== undefined && <div className={styles.right}>{right}</div>}

      {hasMenu && menuOpen && (
        <div
          id={menuId}
          ref={panelRef}
          className={styles.menuPanel}
          onKeyDown={handleMenuKeyDown}
        >
          <nav className={styles.menuNav} aria-label="Menú principal">
            {items.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                className={styles.menuLink}
                aria-current={linkIsCurrent(currentPath, link)}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  )
}
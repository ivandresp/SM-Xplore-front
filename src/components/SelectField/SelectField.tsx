import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { classNames } from '@/utils/format'
import styles from './SelectField.module.css'

export interface SelectOption {
  value: string
  label: string
}

export interface SelectOptionGroup {
  label: string
  options: SelectOption[]
}

/**
 * Evento compatible con el `onChange` de un `<select>` nativo: las páginas
 * siguen leyendo `event.target.value`, así que la API no cambia.
 */
export interface SelectChangeEvent {
  target: { value: string; name: string | undefined }
}

export interface SelectFieldProps {
  /** Etiqueta visible asociada por `htmlFor`/`id`. Si falta, usa `aria-label`. */
  label?: string
  hint?: string
  id?: string
  /** Opciones planas (se ignoran si llega `groups`). */
  options?: SelectOption[]
  /** Opciones agrupadas; se anuncian con `role="group"`. */
  groups?: SelectOptionGroup[]
  /** Opción vacía inicial («Todas las zonas», «Selecciona…»). */
  placeholder?: string
  value?: string
  name?: string
  disabled?: boolean
  required?: boolean
  error?: string
  className?: string
  'aria-label'?: string
  'aria-describedby'?: string
  onChange?: (event: SelectChangeEvent) => void
  /** Se dispara cuando el foco sale del disparador (paridad con el select nativo). */
  onBlur?: () => void
}

interface FlatOption extends SelectOption {
  group: string | null
}

/** Aplana las opciones para que el teclado recorra un único índice. */
function flattenOptions(
  groups: SelectOptionGroup[] | undefined,
  options: SelectOption[] | undefined,
  placeholder: string | undefined,
): FlatOption[] {
  const flat: FlatOption[] = []

  if (placeholder !== undefined) {
    flat.push({ value: '', label: placeholder, group: null })
  }

  if (groups !== undefined) {
    for (const group of groups) {
      for (const option of group.options) {
        flat.push({ ...option, group: group.label })
      }
    }
    return flat
  }

  for (const option of options ?? []) {
    flat.push({ ...option, group: null })
  }

  return flat
}

function describedBy(
  fieldId: string,
  hint: string | undefined,
  error: string | undefined,
  existing: string | undefined,
): string | undefined {
  const ids = [
    existing ?? '',
    hint === undefined ? '' : `${fieldId}-hint`,
    error === undefined ? '' : `${fieldId}-error`,
  ].filter((id) => id !== '')

  return ids.length === 0 ? undefined : ids.join(' ')
}

/**
 * Selector controlado con el patrón «select-only combobox» de ARIA 1.2:
 * el foco se queda en el disparador y la opción activa se anuncia con
 * `aria-activedescendant`. Teclado: flechas, Home/End, Enter/Espacio,
 * Escape, Tab y escritura para saltar a una opción.
 *
 * Límites conocidos (los formularios del repo validan a mano con `noValidate`):
 * - `required` solo se anuncia (`aria-required`); no hay validación nativa y el
 *   input oculto de `name` siempre pasa `checkValidity()`.
 * - No implementa `form.reset()`: es un campo controlado, el valor vive en el
 *   estado de la página y hoy ninguna pantalla resetea formularios.
 * - `name` y el modo no controlado (`value` ausente) están por paridad con
 *   `SelectField` de `FormField`, pero ninguna página los usa todavía.
 */
export function SelectField({
  label,
  hint,
  id,
  options,
  groups,
  placeholder,
  value,
  name,
  disabled = false,
  required = false,
  error,
  className,
  'aria-label': ariaLabel,
  'aria-describedby': describedByProp,
  onChange,
  onBlur,
}: SelectFieldProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const labelId = `${fieldId}-label`
  const listboxId = `${fieldId}-listbox`

  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [innerValue, setInnerValue] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const typeaheadRef = useRef('')
  const typeaheadTimer = useRef<number | undefined>(undefined)

  const currentValue = value ?? innerValue
  const flat = flattenOptions(groups, options, placeholder)
  const selectedIndex = flat.findIndex(
    (option) => option.value === currentValue,
  )

  useEffect(() => {
    return () => window.clearTimeout(typeaheadTimer.current)
  }, [])

  // La lista desborda con scroll propio: la opción activa se mantiene visible
  // dentro del listbox sin mover el scroll de la página (B2-08).
  useEffect(() => {
    if (!open || activeIndex < 0) {
      return
    }

    const listbox = document.getElementById(listboxId)
    const option = document.getElementById(`${fieldId}-opt-${activeIndex}`)

    if (listbox === null || option === null) {
      return
    }

    const top = option.offsetTop

    if (top < listbox.scrollTop) {
      listbox.scrollTop = top
    } else if (
      top + option.offsetHeight >
      listbox.scrollTop + listbox.clientHeight
    ) {
      listbox.scrollTop = top + option.offsetHeight - listbox.clientHeight
    }
  }, [open, activeIndex, fieldId, listboxId])

  useEffect(() => {
    if (!open) {
      return
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        rootRef.current?.contains(event.target) !== true
      ) {
        setOpen(false)
        setActiveIndex(-1)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)

    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  function openList(direction: 1 | -1) {
    setOpen(true)
    setActiveIndex(
      selectedIndex >= 0
        ? selectedIndex
        : direction === 1
          ? 0
          : flat.length - 1,
    )
  }

  function closeList() {
    setOpen(false)
    setActiveIndex(-1)
  }

  function move(delta: 1 | -1) {
    if (flat.length === 0) {
      return
    }

    const base = activeIndex < 0 ? (delta === 1 ? -1 : 0) : activeIndex
    setActiveIndex((base + delta + flat.length) % flat.length)
  }

  function commit(index: number) {
    const option = flat[index]

    if (option === undefined) {
      return
    }

    closeList()

    if (value === undefined) {
      setInnerValue(option.value)
    }

    if (option.value !== currentValue) {
      onChange?.({ target: { value: option.value, name } })
    }
  }

  function typeahead(char: string) {
    typeaheadRef.current += char.toLowerCase()
    window.clearTimeout(typeaheadTimer.current)
    typeaheadTimer.current = window.setTimeout(() => {
      typeaheadRef.current = ''
    }, 600)

    const query = typeaheadRef.current
    const total = flat.length
    const from =
      activeIndex >= 0 ? activeIndex : selectedIndex >= 0 ? selectedIndex : -1

    for (let step = 1; step <= total; step += 1) {
      const index = (from + step + total) % total
      const option = flat[index]

      if (option !== undefined && option.label.toLowerCase().startsWith(query)) {
        setActiveIndex(index)
        return
      }
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const { key } = event
    const printable =
      key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey

    if (key === 'ArrowDown' || key === 'ArrowUp') {
      event.preventDefault()

      if (open) {
        move(key === 'ArrowDown' ? 1 : -1)
      } else {
        openList(key === 'ArrowDown' ? 1 : -1)
      }

      return
    }

    if (key === 'Home' || key === 'End') {
      if (!open || flat.length === 0) {
        return
      }

      event.preventDefault()
      setActiveIndex(key === 'Home' ? 0 : flat.length - 1)
      return
    }

    if (key === 'Enter' || key === ' ') {
      event.preventDefault()

      if (open) {
        commit(activeIndex)
      } else {
        openList(1)
      }

      return
    }

    if (key === 'Escape') {
      if (open) {
        event.preventDefault()
        closeList()
      }

      return
    }

    if (key === 'Tab') {
      closeList()
      return
    }

    if (printable) {
      event.preventDefault()

      if (!open) {
        setOpen(true)
      }

      typeahead(key)
    }
  }

  function renderOption(index: number, option: SelectOption) {
    const isSelected = option.value === currentValue

    return (
      <div
        key={option.value === '' ? `${fieldId}-empty` : option.value}
        id={`${fieldId}-opt-${index}`}
        role="option"
        aria-selected={isSelected}
        data-active={index === activeIndex}
        className={styles.option}
        onMouseDown={(event) => event.preventDefault()}
        onMouseEnter={() => setActiveIndex(index)}
        onClick={() => {
          commit(index)
          triggerRef.current?.focus()
        }}
      >
        {option.label}
      </div>
    )
  }

  const firstGroupIndex = placeholder === undefined ? 0 : 1
  let groupStart = firstGroupIndex

  return (
    <div className={styles.field} ref={rootRef}>
      {label !== undefined && (
        <label
          className={styles.label}
          htmlFor={fieldId}
          id={labelId}
          data-required={required ? '' : undefined}
          onClick={(event) => {
            // Como un <select> nativo: el clic en la etiqueta enfoca, no abre.
            if (event.target === event.currentTarget) {
              event.preventDefault()
              triggerRef.current?.focus()
            }
          }}
        >
          {label}
          {required && (
            <span className={styles.required} aria-hidden="true">
              {' *'}
            </span>
          )}
        </label>
      )}

      <button
        ref={triggerRef}
        type="button"
        id={fieldId}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={
          open && activeIndex >= 0
            ? `${fieldId}-opt-${activeIndex}`
            : undefined
        }
        aria-labelledby={label === undefined ? undefined : labelId}
        aria-label={label === undefined ? ariaLabel : undefined}
        aria-describedby={describedBy(
          fieldId,
          hint,
          error,
          describedByProp,
        )}
        aria-invalid={error === undefined ? undefined : true}
        aria-required={required ? true : undefined}
        disabled={disabled}
        className={classNames(styles.control, className)}
        onClick={() => {
          if (open) {
            closeList()
          } else {
            openList(1)
          }
        }}
        onKeyDown={handleKeyDown}
        onBlur={onBlur}
      >
        <span className={styles.value}>
          {flat[selectedIndex]?.label ?? placeholder ?? ''}
        </span>
        <svg className={styles.chevron} viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {name !== undefined && (
        <input type="hidden" name={name} value={currentValue} readOnly />
      )}

      <div
        id={listboxId}
        role="listbox"
        aria-labelledby={label === undefined ? undefined : labelId}
        aria-label={label === undefined ? ariaLabel : undefined}
        hidden={!open}
        className={styles.listbox}
      >
        {flat.length === 0 && <p className={styles.empty}>Sin opciones</p>}

        {placeholder !== undefined && renderOption(0, flat[0] as SelectOption)}

        {groups !== undefined
          ? groups.map((group) => {
              const start = groupStart
              groupStart += group.options.length

              return (
                <div key={group.label} role="group" aria-label={group.label}>
                  <p className={styles.groupLabel} aria-hidden="true">
                    {group.label}
                  </p>
                  {group.options.map((option, index) =>
                    renderOption(start + index, option),
                  )}
                </div>
              )
            })
          : (options ?? []).map((option, index) =>
              renderOption(firstGroupIndex + index, option),
            )}
      </div>

      {hint !== undefined && (
        <p className={styles.hint} id={`${fieldId}-hint`}>
          {hint}
        </p>
      )}
      {error !== undefined && (
        // aria-live="polite": el error se anuncia sin competir con el resumen
        // del formulario, que es el único role="alert".
        <p
          className={styles.error}
          id={`${fieldId}-error`}
          aria-live="polite"
        >
          {error}
        </p>
      )}
    </div>
  )
}

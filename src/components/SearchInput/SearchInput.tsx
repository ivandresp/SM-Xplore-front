import { useLanguage } from '@/hooks/useLanguage'
import styles from './SearchInput.module.css'

export interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label: string
  className?: string
}

/** Campo de búsqueda redondeado de las barras de herramientas. */
export function SearchInput({
  value,
  onChange,
  placeholder,
  label,
  className,
}: SearchInputProps) {
  useLanguage()
  return (
    <input
      type="search"
      className={className ?? styles.input}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      aria-label={label}
    />
  )
}

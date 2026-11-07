import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/Button'
import { Field, SelectField } from '@/components/FormField'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { usersApi } from '@/services/usersApi'
import { describeApiError } from '@/utils/errors'
import type { CreateUserRequest } from '@/types'
import styles from './admin.module.css'

type CreatableRole = CreateUserRequest['role']

const ROLE_OPTIONS = [
  { value: 'GUIDE', label: 'Guía turístico' },
  { value: 'DESTINATION_MANAGER', label: 'Gestora de destinos' },
  { value: 'ADMIN', label: 'Administrador' },
]

export default function CreateUserPage() {
  const navigate = useNavigate()

  const [role, setRole] = useState<CreatableRole>('GUIDE')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [dniType, setDniType] = useState('')
  const [dniNumber, setDniNumber] = useState('')
  const [license, setLicense] = useState('')
  const [nit, setNit] = useState('')
  const [startOperationDate, setStartOperationDate] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isGuide = role === 'GUIDE'
  const needsNit = role === 'DESTINATION_MANAGER'

  async function handleSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    setError(null)

    const trimmedName = fullName.trim()
    const trimmedEmail = email.trim()

    if (trimmedName === '' || trimmedEmail === '') {
      setError('Escribe el nombre y el correo de la persona.')
      return
    }
    if (isGuide && (dniType.trim() === '' || dniNumber.trim() === '')) {
      setError('Un guía necesita tipo y número de documento.')
      return
    }
    if (isGuide && license.trim() === '') {
      setError('Un guía necesita número de licencia.')
      return
    }
    if (needsNit && nit.trim() === '') {
      setError('Una gestora de destinos necesita NIT.')
      return
    }
    const trimmedPhone = phone.trim()
    if (trimmedPhone !== '' && !/^[0-9+()\-\s]{7,20}$/.test(trimmedPhone)) {
      setError('El teléfono debe tener entre 7 y 20 caracteres válidos.')
      return
    }

    setIsSaving(true)

    try {
      const created = await usersApi.create({
        role,
        fullName: trimmedName,
        email: trimmedEmail,
        phone: phone.trim() || undefined,
        ...(isGuide || role === 'ADMIN'
          ? {
              dniType: dniType.trim() || undefined,
              dniNumber: dniNumber.trim() || undefined,
            }
          : {}),
        ...(isGuide ? { license: license.trim() } : {}),
        ...(needsNit ? { nit: nit.trim() } : {}),
        ...(startOperationDate !== ''
          ? { startOperationDate }
          : {}),
      })

      navigate(`/app/usuarios/${created.id}`, { replace: true })
    } catch (cause) {
      setError(describeApiError(cause))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section>
      <Link to="/app/usuarios" className={styles.back}>
        ← Volver al listado
      </Link>

      <PageHeader
        breadcrumb={[
          { label: 'Usuarios', to: '/app/usuarios' },
          { label: 'Crear usuario' },
        ]}
        title="Crear usuario interno"
        description="Solo se crean cuentas de guía, gestora de destinos o administrador. La persona recibe una invitación por correo para fijar su contraseña."
      />

      {error !== null && (
        <p className={`${styles.feedback} ${styles.error}`} role="alert">
          {error}
        </p>
      )}

      <form className={styles.card} onSubmit={handleSubmit} noValidate>
        <h2 className={styles.cardTitle}>Datos de la cuenta</h2>

        <div className={styles.stack}>
          <SelectField
            label="Rol"
            options={ROLE_OPTIONS}
            value={role}
            onChange={(event) => setRole(event.target.value as CreatableRole)}
          />
          <Field
            label="Nombre completo"
            maxLength={150}
            required
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
          />
          <Field
            label="Correo"
            type="email"
            maxLength={150}
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            hint="Ahí llega la invitación para activar la cuenta."
          />
          <Field
            label="Teléfono"
            maxLength={20}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            hint="Opcional. Entre 7 y 20 caracteres."
          />

          {(isGuide || role === 'ADMIN') && (
            <>
              <Field
                label={isGuide ? 'Tipo de documento' : 'Tipo de documento (opcional)'}
                maxLength={20}
                required={isGuide}
                value={dniType}
                onChange={(event) => setDniType(event.target.value)}
              />
              <Field
                label={isGuide ? 'Número de documento' : 'Número de documento (opcional)'}
                maxLength={30}
                required={isGuide}
                value={dniNumber}
                onChange={(event) => setDniNumber(event.target.value)}
              />
            </>
          )}

          {isGuide && (
            <Field
              label="Licencia"
              maxLength={50}
              required
              value={license}
              onChange={(event) => setLicense(event.target.value)}
            />
          )}

          {needsNit && (
            <Field
              label="NIT"
              maxLength={30}
              required
              value={nit}
              onChange={(event) => setNit(event.target.value)}
            />
          )}

          {role !== 'ADMIN' && (
            <Field
              label="Inicio de operación"
              type="date"
              value={startOperationDate}
              onChange={(event) => setStartOperationDate(event.target.value)}
              hint="Opcional."
            />
          )}
        </div>

        <div className={styles.actions}>
          <Button variant="primary" type="submit" disabled={isSaving}>
            {isSaving ? 'Creando…' : 'Crear usuario'}
          </Button>
          <Link to="/app/usuarios">
            <Button variant="outline">Cancelar</Button>
          </Link>
        </div>
      </form>
    </section>
  )
}

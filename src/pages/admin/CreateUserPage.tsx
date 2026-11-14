import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/Button'
import { Field } from '@/components/FormField'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { SelectField } from '@/components/SelectField'
import { useFormValidation } from '@/hooks/useFormValidation'
import { usersApi } from '@/services/usersApi'
import { describeApiError } from '@/utils/errors'
import type { CreateUserRequest } from '@/types'
import styles from './admin.module.css'

type CreatableRole = CreateUserRequest['role']

type CreateField =
  | 'fullName'
  | 'email'
  | 'phone'
  | 'dniType'
  | 'dniNumber'
  | 'license'
  | 'nit'

const ROLE_OPTIONS = [
  { value: 'GUIDE', label: 'Guía turístico' },
  { value: 'DESTINATION_MANAGER', label: 'Gestora de destinos' },
  { value: 'ADMIN', label: 'Administrador' },
]

const LABELS: Record<CreateField, string> = {
  fullName: 'Nombre completo',
  email: 'Correo',
  phone: 'Teléfono',
  dniType: 'Tipo de documento',
  dniNumber: 'Número de documento',
  license: 'Licencia',
  nit: 'NIT',
}

const ORDER: readonly CreateField[] = [
  'fullName',
  'email',
  'phone',
  'dniType',
  'dniNumber',
  'license',
  'nit',
]

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function CreateUserPage() {
  const navigate = useNavigate()
  const formRef = useRef<HTMLFormElement>(null)

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

  // Reglas de `CreateInternalUserRequest` (ms-01): nombre y correo obligatorios,
  // documento y licencia obligatorios para guías, NIT para gestoras.
  const form = useFormValidation({
    values: { fullName, email, phone, dniType, dniNumber, license, nit },
    validate: (values) => {
      const errors: Partial<Record<CreateField, string>> = {}

      if (values.fullName.trim() === '') {
        errors.fullName = 'Escribe el nombre.'
      }
      if (!EMAIL.test(values.email.trim())) {
        errors.email = 'Escribe un correo válido, con @ y dominio.'
      }
      if (
        values.phone.trim() !== '' &&
        !/^[0-9+()\-\s]{7,20}$/.test(values.phone.trim())
      ) {
        errors.phone = 'Usa entre 7 y 20 dígitos; puedes incluir +, () o guiones.'
      }
      if (isGuide && values.dniType.trim() === '') {
        errors.dniType = 'Un guía necesita tipo de documento.'
      }
      if (isGuide && values.dniNumber.trim() === '') {
        errors.dniNumber = 'Un guía necesita número de documento.'
      }
      if (isGuide && values.license.trim() === '') {
        errors.license = 'Un guía necesita número de licencia.'
      }
      if (needsNit && !/^[0-9\-]{6,30}$/.test(values.nit.trim())) {
        errors.nit = 'El NIT lleva entre 6 y 30 dígitos o guiones.'
      }

      return errors
    },
    labels: LABELS,
    order: ORDER,
    formRef,
  })

  async function handleSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    setError(null)

    if (form.blocked()) {
      return
    }

    const trimmedPhone = phone.trim()
    setIsSaving(true)

    try {
      const created = await usersApi.create({
        role,
        fullName: fullName.trim(),
        email: email.trim(),
        ...(trimmedPhone === '' ? {} : { phone: trimmedPhone }),
        ...(isGuide || role === 'ADMIN'
          ? {
              ...(dniType.trim() === '' ? {} : { dniType: dniType.trim() }),
              ...(dniNumber.trim() === ''
                ? {}
                : { dniNumber: dniNumber.trim() }),
            }
          : {}),
        ...(isGuide ? { license: license.trim() } : {}),
        ...(needsNit ? { nit: nit.trim() } : {}),
        ...(startOperationDate === '' ? {} : { startOperationDate }),
      })

      navigate(`/app/usuarios/${created.id}`, { replace: true })
    } catch (cause) {
      if (!form.applyValidationErrors(cause)) {
        setError(describeApiError(cause))
      }
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
      {error === null && form.summary !== null && (
        <p className={`${styles.feedback} ${styles.error}`} role="alert">
          {form.summary}
        </p>
      )}

      <form className={styles.card} onSubmit={handleSubmit} noValidate ref={formRef}>
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
            name="fullName"
            maxLength={150}
            required
            value={fullName}
            error={form.errorOf('fullName')}
            onChange={(event) => setFullName(event.target.value)}
            onBlur={() => form.markTouched('fullName')}
          />
          <Field
            label="Correo"
            type="email"
            name="email"
            maxLength={150}
            required
            value={email}
            error={form.errorOf('email')}
            onChange={(event) => setEmail(event.target.value)}
            onBlur={() => form.markTouched('email')}
            hint="Ahí llega la invitación para activar la cuenta."
          />
          <Field
            label="Teléfono"
            name="phone"
            maxLength={20}
            value={phone}
            error={form.errorOf('phone')}
            onChange={(event) => setPhone(event.target.value)}
            onBlur={() => form.markTouched('phone')}
            hint="Opcional. Entre 7 y 20 caracteres."
          />

          {(isGuide || role === 'ADMIN') && (
            <>
              <Field
                label={isGuide ? 'Tipo de documento' : 'Tipo de documento (opcional)'}
                name="dniType"
                maxLength={20}
                required={isGuide}
                value={dniType}
                error={form.errorOf('dniType')}
                onChange={(event) => setDniType(event.target.value)}
                onBlur={() => form.markTouched('dniType')}
              />
              <Field
                label={isGuide ? 'Número de documento' : 'Número de documento (opcional)'}
                name="dniNumber"
                maxLength={30}
                required={isGuide}
                value={dniNumber}
                error={form.errorOf('dniNumber')}
                onChange={(event) => setDniNumber(event.target.value)}
                onBlur={() => form.markTouched('dniNumber')}
              />
            </>
          )}

          {isGuide && (
            <Field
              label="Licencia"
              name="license"
              maxLength={50}
              required
              value={license}
              error={form.errorOf('license')}
              onChange={(event) => setLicense(event.target.value)}
              onBlur={() => form.markTouched('license')}
            />
          )}

          {needsNit && (
            <Field
              label="NIT"
              name="nit"
              maxLength={30}
              required
              value={nit}
              error={form.errorOf('nit')}
              onChange={(event) => setNit(event.target.value)}
              onBlur={() => form.markTouched('nit')}
            />
          )}

          {role !== 'ADMIN' && (
            <Field
              label="Inicio de operación"
              name="startOperationDate"
              type="date"
              value={startOperationDate}
              onChange={(event) => setStartOperationDate(event.target.value)}
              hint="Opcional."
            />
          )}
        </div>

        <div className={styles.actions}>
          <Button variant="primary" type="submit" loading={isSaving}>
            Crear usuario
          </Button>
          <Link to="/app/usuarios">
            <Button variant="outline">Cancelar</Button>
          </Link>
        </div>
      </form>
    </section>
  )
}

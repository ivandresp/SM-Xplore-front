import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMessageState } from '@/hooks/useMessageState'
import { translate as t } from '@/i18n/language'
import { useLanguage } from '@/hooks/useLanguage'
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
  { value: 'GUIDE', get label() { return t("Guía turístico") } },
  { value: 'DESTINATION_MANAGER', get label() { return t("Gestora de destinos") } },
  { value: 'ADMIN', get label() { return t("Administrador") } },
]

const LABELS: Record<CreateField, string> = {
  get fullName() { return t("Nombre completo") },
  get email() { return t("Correo") },
  get phone() { return t("Teléfono") },
  get dniType() { return t("Tipo de documento") },
  get dniNumber() { return t("Número de documento") },
  get license() { return t("Licencia") },
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
  useLanguage()
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
  const [error, setError] = useMessageState<string | null>(null)

  const isGuide = role === 'GUIDE'
  const needsNit = role === 'DESTINATION_MANAGER'

  // Reglas de `CreateInternalUserRequest` (ms-01): nombre y correo obligatorios,
  // documento y licencia obligatorios para guías, NIT para gestoras.
  const form = useFormValidation({
    values: { fullName, email, phone, dniType, dniNumber, license, nit },
    validate: (values) => {
      const errors: Partial<Record<CreateField, string>> = {}

      if (values.fullName.trim() === '') {
        errors.fullName = t("Escribe el nombre.")
      }
      if (!EMAIL.test(values.email.trim())) {
        errors.email = t("Escribe un correo válido, con @ y dominio.")
      }
      if (
        values.phone.trim() !== '' &&
        !/^[0-9+()\-\s]{7,20}$/.test(values.phone.trim())
      ) {
        errors.phone = t("Usa entre 7 y 20 dígitos; puedes incluir +, () o guiones.")
      }
      if (isGuide && values.dniType.trim() === '') {
        errors.dniType = t("Un guía necesita tipo de documento.")
      }
      if (isGuide && values.dniNumber.trim() === '') {
        errors.dniNumber = t("Un guía necesita número de documento.")
      }
      if (isGuide && values.license.trim() === '') {
        errors.license = t("Un guía necesita número de licencia.")
      }
      if (needsNit && !/^[0-9\-]{6,30}$/.test(values.nit.trim())) {
        errors.nit = t("El NIT lleva entre 6 y 30 dígitos o guiones.")
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
        setError(() => describeApiError(cause))
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section>
      <Link to="/app/usuarios" className={styles.back}>
        {t("← Volver al listado")}</Link>

      <PageHeader
        breadcrumb={[
          { label: t("Usuarios"), to: '/app/usuarios' },
          { label: t("Crear usuario") },
        ]}
        title={t("Crear usuario interno")}
        description={t("Solo se crean cuentas de guía, gestora de destinos o administrador. La persona recibe una invitación por correo para fijar su contraseña.")}
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
        <h2 className={styles.cardTitle}>{t("Datos de la cuenta")}</h2>

        <div className={styles.stack}>
          <SelectField
            label={t("Rol")}
            options={ROLE_OPTIONS}
            value={role}
            onChange={(event) => setRole(event.target.value as CreatableRole)}
          />
          <Field
            label={t("Nombre completo")}
            name="fullName"
            maxLength={150}
            required
            value={fullName}
            error={form.errorOf('fullName')}
            onChange={(event) => setFullName(event.target.value)}
            onBlur={() => form.markTouched('fullName')}
          />
          <Field
            label={t("Correo")}
            type="email"
            name="email"
            maxLength={150}
            required
            value={email}
            error={form.errorOf('email')}
            onChange={(event) => setEmail(event.target.value)}
            onBlur={() => form.markTouched('email')}
            hint={t("Ahí llega la invitación para activar la cuenta.")}
          />
          <Field
            label={t("Teléfono")}
            name="phone"
            maxLength={20}
            value={phone}
            error={form.errorOf('phone')}
            onChange={(event) => setPhone(event.target.value)}
            onBlur={() => form.markTouched('phone')}
            hint={t("Opcional. Entre 7 y 20 caracteres.")}
          />

          {(isGuide || role === 'ADMIN') && (
            <>
              <Field
                label={isGuide ? t("Tipo de documento") : t("Tipo de documento (opcional)")}
                name="dniType"
                maxLength={20}
                required={isGuide}
                value={dniType}
                error={form.errorOf('dniType')}
                onChange={(event) => setDniType(event.target.value)}
                onBlur={() => form.markTouched('dniType')}
              />
              <Field
                label={isGuide ? t("Número de documento") : t("Número de documento (opcional)")}
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
              label={t("Licencia")}
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
              label={t("Inicio de operación")}
              name="startOperationDate"
              type="date"
              value={startOperationDate}
              onChange={(event) => setStartOperationDate(event.target.value)}
              hint={t("Opcional.")}
            />
          )}
        </div>

        <div className={styles.actions}>
          <Button variant="primary" type="submit" loading={isSaving}>
            {t("Crear usuario")}</Button>
          <Link to="/app/usuarios">
            <Button variant="outline">{t("Cancelar")}</Button>
          </Link>
        </div>
      </form>
    </section>
  )
}

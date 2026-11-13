import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/Button'
import { Field, SelectField } from '@/components/FormField'
import { useAuth } from '@/hooks/useAuth'
import { categoriesApi } from '@/services/categoriesApi'
import { recommendationsApi } from '@/services/recommendationsApi'
import { usersApi } from '@/services/usersApi'
import { describeApiError } from '@/utils/errors'
import { classNames } from '@/utils/format'
import type {
  CategoryResponse,
  PreferenceResponse,
  UpdateMyProfileRequest,
} from '@/types'
import {
  LANGUAGE_OPTIONS,
  ONBOARDING_PATHS,
  ONBOARDING_STEP_COUNT,
  ONBOARDING_STEP_LABELS,
  buildProfilePatch,
  describeSavedProfile,
  categoryEmoji,
  deriveOnboardingProgress,
  finishTargets,
} from './onboardingModel'
import type { OnboardingStep } from './onboardingModel'
import styles from './onboarding.module.css'

/**
 * Onboarding de 3 pasos tipo cápsulas. No guarda un flag de «terminado»: el
 * progreso se deriva de las preferencias que ya están en el backend y del
 * perfil del turista, así que volver a /bienvenida lo reconstruye tal cual.
 */
export default function OnboardingPage() {
  const { user, updateSessionUser } = useAuth()
  const navigate = useNavigate()
  const titleRef = useRef<HTMLHeadingElement>(null)

  // null = todavía no hay datos reales para decidir en qué paso entrar.
  const [manualStep, setManualStep] = useState<OnboardingStep | null>(null)
  const [entryStep, setEntryStep] = useState<OnboardingStep | null>(null)

  const [categories, setCategories] = useState<CategoryResponse[] | null>(null)
  const [categoryError, setCategoryError] = useState<string | null>(null)
  const [savedPreferences, setSavedPreferences] = useState<
    PreferenceResponse[] | null
  >(null)
  const [preferencesError, setPreferencesError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const [pendingCategoryId, setPendingCategoryId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const [nationality, setNationality] = useState('')
  const [preferredLanguage, setPreferredLanguage] = useState('')
  const [profileError, setProfileError] = useState<string | null>(null)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [savedProfilePatch, setSavedProfilePatch] =
    useState<UpdateMyProfileRequest | null>(null)
  const [profileSavedNow, setProfileSavedNow] = useState(false)
  const [draftOwner, setDraftOwner] = useState<string | null>(null)

  const touristProfile = user !== null && user.role === 'TOURIST' ? user.profile : null
  /**
   * Solo cuentan las preferencias EXPLICIT: abrir una ficha crea una INFERRED
   * con peso 0.15 (ms-05), así que una vista no puede encender el progreso ni
   * marcar cápsulas como elegidas.
   */
  const explicitPreferences = (savedPreferences ?? []).filter(
    (preference) => preference.source === 'EXPLICIT',
  )
  const progress = deriveOnboardingProgress({
    preferenceCount: explicitPreferences.length,
    profile: touristProfile,
  })

  useEffect(() => {
    let cancelled = false

    // Una fuente que falla no debe tumbar la otra: se avisa y se puede seguir.
    void Promise.allSettled([
      categoriesApi.list(),
      recommendationsApi.listPreferences(),
    ]).then(([cats, prefs]) => {
      if (cancelled) {
        return
      }

      if (cats.status === 'fulfilled') {
        setCategories(cats.value)
      } else {
        setCategoryError(describeApiError(cats.reason))
      }

      if (prefs.status === 'fulfilled') {
        setSavedPreferences(prefs.value)
      } else {
        setPreferencesError(describeApiError(prefs.reason))
      }
    })

    return () => {
      cancelled = true
    }
  }, [reloadToken])

  /**
   * El paso de entrada se decide una sola vez, cuando ya hay datos reales: paso
   * 2 si hay intereses guardados, paso 3 si además el perfil está completo. Se
   * fija para que elegir una cápsula no salte de paso a mitad de la selección.
   */
  if (
    entryStep === null &&
    user !== null &&
    (savedPreferences !== null || preferencesError !== null)
  ) {
    setEntryStep(progress.suggestedStep)
  }

  const step = manualStep ?? entryStep

  // El borrador del perfil se rellena con lo que el backend ya tiene. Se ajusta
  // durante el render, no en un efecto, igual que la sincronización de
  // RegisterPage con su prop.
  if (user !== null && user.role === 'TOURIST' && draftOwner !== user.id) {
    setDraftOwner(user.id)
    setNationality(user.profile?.nationality ?? '')
    setPreferredLanguage(user.profile?.preferredLanguage ?? '')
  }

  useEffect(() => {
    if (step !== null) {
      titleRef.current?.focus()
    }
  }, [step])

  function goToStep(next: OnboardingStep) {
    setActionError(null)
    setProfileError(null)
    setStatusMessage(null)
    setManualStep(next)
  }

  function retryLoad() {
    setCategoryError(null)
    setPreferencesError(null)
    setReloadToken((current) => current + 1)
  }

  async function toggleCategory(categoryId: string) {
    if (savedPreferences === null || pendingCategoryId !== null) {
      return
    }

    const isSaved = explicitPreferences.some(
      (preference) => preference.categoryId === categoryId,
    )

    setPendingCategoryId(categoryId)
    setActionError(null)
    setStatusMessage(null)

    try {
      if (isSaved) {
        await recommendationsApi.removePreference(categoryId)
        setSavedPreferences((current) =>
          (current ?? []).filter(
            (preference) => preference.categoryId !== categoryId,
          ),
        )
        setStatusMessage('Quitamos ese interés de tu perfil.')
        return
      }

      const created = await recommendationsApi.addPreference(categoryId)
      setSavedPreferences((current) => [
        ...(current ?? []).filter(
          (preference) => preference.categoryId !== categoryId,
        ),
        created,
      ])
      setStatusMessage('Guardamos ese interés en tu perfil.')
    } catch (cause) {
      setActionError(describeApiError(cause))
    } finally {
      setPendingCategoryId(null)
    }
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const patch = buildProfilePatch({ nationality, preferredLanguage })
    if (Object.keys(patch).length === 0) {
      setProfileError('Elige al menos un dato o pulsa Omitir.')
      return
    }

    setIsSavingProfile(true)
    setProfileError(null)
    setStatusMessage(null)

    try {
      const updated = await usersApi.updateMe(patch)
      updateSessionUser(updated)
      setSavedProfilePatch(patch)
      setProfileSavedNow(true)
      setStatusMessage(null)
      setManualStep(3)
    } catch (cause) {
      setProfileError(describeApiError(cause))
    } finally {
      setIsSavingProfile(false)
    }
  }

  // Sin datos reales todavía no se pinta un paso: evita el salto visual del
  // paso 1 al que corresponde cuando la persona ya tenía progreso.
  if (user === null || step === null) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <p role="status" className={styles.lead}>
            Preparando tu bienvenida…
          </p>
        </div>
      </main>
    )
  }

  const savedIds = new Set(
    explicitPreferences.map((preference) => preference.categoryId),
  )
  const selectedCategories = (categories ?? []).filter((category) =>
    savedIds.has(category.id),
  )
  const isSavingPreference = pendingCategoryId !== null
  /**
   * Cargando solo mientras no hay respuesta ni error de esa fuente: un fallo se
   * pinta como error con reintento y no deja el paso 1 girando para siempre.
   */
  const isStep1Loading =
    (categories === null && categoryError === null) ||
    (savedPreferences === null && preferencesError === null)
  /** Sin preferencias conocidas no se puede saber qué está marcado: se pausa. */
  const canPickCategories = categories !== null && savedPreferences !== null
  const targets = finishTargets(progress)
  const firstName = user.fullName.split(' ')[0] ?? ''
  const canSubmitProfile =
    nationality.trim() !== '' || preferredLanguage.trim() !== ''

  function renderProgressDot(index: number) {
    const stepNumber = (index + 1) as OnboardingStep
    const done =
      stepNumber === 1
        ? progress.interestsDone
        : stepNumber === 2
          ? progress.profileDone
          : progress.ready
    const current = step === stepNumber
    const state = done ? 'completado' : current ? 'en curso' : 'pendiente'

    return (
      <li
        key={ONBOARDING_STEP_LABELS[index]}
        className={classNames(
          styles.progressItem,
          done && styles.progressDone,
          current && styles.progressCurrent,
        )}
        data-state={done ? 'done' : current ? 'current' : 'pending'}
        aria-current={current ? 'step' : undefined}
      >
        <span className={styles.progressDot} aria-hidden="true" />
        <span className={styles.progressLabel}>
          {ONBOARDING_STEP_LABELS[index]}: {state}
        </span>
      </li>
    )
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.top}>
          <p className={styles.brand}>SM-Xplore</p>
          <span className={styles.topLinks}>
            <Link
              className={styles.skip}
              to={ONBOARDING_PATHS.recommendations}
            >
              Ver recomendaciones
            </Link>
            <Link className={styles.skip} to={ONBOARDING_PATHS.skip}>
              Saltar por ahora
            </Link>
          </span>
        </header>

        <nav className={styles.progress} aria-label="Progreso de la bienvenida">
          <ol className={styles.progressList} aria-label="Pasos de la bienvenida">
            {ONBOARDING_STEP_LABELS.map((_, index) => renderProgressDot(index))}
          </ol>
          <p className={styles.progressHint}>
            Paso {step} de {ONBOARDING_STEP_COUNT}
          </p>
        </nav>

        <section
          key={step}
          className={styles.panel}
          aria-labelledby="onboarding-title"
        >
          {step === 1 && (
            <>
              <h1
                id="onboarding-title"
                ref={titleRef}
                tabIndex={-1}
                className={styles.title}
              >
                ¿Qué te gusta hacer en Santa Marta?
              </h1>
              <p className={styles.lead}>
                Elige tus intereses. Con ellos ordenamos las recomendaciones y
                puedes cambiarlos cuando quieras.
              </p>

              {categoryError !== null && (
                <div className={styles.inlineError}>
                  <p role="alert">{categoryError}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={retryLoad}
                  >
                    Reintentar
                  </Button>
                </div>
              )}

              {preferencesError !== null && (
                <div className={styles.inlineError}>
                  <p role="alert">{preferencesError}</p>
                  <Button variant="outline" size="sm" onClick={retryLoad}>
                    Reintentar
                  </Button>
                </div>
              )}

              {isStep1Loading && (
                <p className={styles.status} role="status">
                  Cargando intereses…
                </p>
              )}

              {!isStep1Loading && categories !== null && categories.length === 0 && (
                <p className={styles.status}>
                  Todavía no hay categorías publicadas. Puedes continuar.
                </p>
              )}

              {!isStep1Loading && categories !== null && categories.length > 0 && (
                <ul className={styles.capsules}>
                  {categories.map((category, index) => {
                    const isSaved = savedIds.has(category.id)
                    const isPending = pendingCategoryId === category.id

                    return (
                      <li key={category.id}>
                        <button
                          type="button"
                          className={classNames(
                            styles.capsule,
                            isSaved && styles.capsuleSelected,
                            !canPickCategories && styles.capsuleBusy,
                          )}
                          aria-pressed={isSaved}
                          aria-busy={isPending ? true : undefined}
                          aria-disabled={
                            !canPickCategories || isSavingPreference
                              ? true
                              : undefined
                          }
                          onClick={() => void toggleCategory(category.id)}
                        >
                          <span className={styles.emoji} aria-hidden="true">
                            {categoryEmoji(category.name, index)}
                          </span>
                          <span className={styles.capsuleName}>
                            {category.name}
                          </span>
                          <span className={styles.capsuleState} aria-hidden="true">
                            {isPending ? '…' : isSaved ? '✓' : ''}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}

              {isSavingPreference && (
                <p className={styles.status} role="status">
                  Guardando… espera un momento.
                </p>
              )}
              {actionError !== null && (
                <p className={styles.error} role="alert">
                  {actionError}
                </p>
              )}
              {!isSavingPreference && statusMessage !== null && (
                <p className={styles.status} role="status">
                  {statusMessage}
                </p>
              )}

              <div className={styles.actions}>
                <Button onClick={() => goToStep(2)} disabled={isStep1Loading}>
                  Continuar
                </Button>
                <span className={styles.actionsHint}>
                  Elige al menos un interés para personalizar tus recomendaciones.
                </span>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h1
                id="onboarding-title"
                ref={titleRef}
                tabIndex={-1}
                className={styles.title}
              >
                Cuéntanos de ti
              </h1>
              <p className={styles.lead}>
                Estos son tus datos de registro; puedes cambiarlos aquí o en tu
                perfil.
              </p>

              <form className={styles.form} onSubmit={handleProfileSubmit} noValidate>
                <Field
                  label="Nacionalidad"
                  name="nationality"
                  autoComplete="country-name"
                  placeholder="Ejemplo: Colombia…"
                  value={nationality}
                  onChange={(event) => setNationality(event.target.value)}
                />
                <SelectField
                  label="Idioma preferido"
                  name="preferredLanguage"
                  value={preferredLanguage}
                  options={[
                    { value: '', label: 'Sin especificar' },
                    ...LANGUAGE_OPTIONS.map((option) => ({
                      value: option.value,
                      label: option.label,
                    })),
                  ]}
                  onChange={(event) => setPreferredLanguage(event.target.value)}
                />

                {profileError !== null && (
                  <p className={styles.error} role="alert">
                    {profileError}
                  </p>
                )}

                <div className={styles.actions}>
                  <Button
                    type="submit"
                    disabled={isSavingProfile || !canSubmitProfile}
                  >
                    {isSavingProfile ? 'Guardando…' : 'Guardar y continuar'}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={isSavingProfile}
                    onClick={() => goToStep(3)}
                  >
                    Omitir
                  </Button>
                  <button
                    type="button"
                    className={styles.linkButton}
                    onClick={() => goToStep(1)}
                  >
                    Atrás
                  </button>
                </div>
                <p className={styles.actionsHint}>
                  Elige al menos un dato o pulsa Omitir.
                </p>
              </form>
            </>
          )}

          {step === 3 && (
            <>
              <h1
                id="onboarding-title"
                ref={titleRef}
                tabIndex={-1}
                className={styles.title}
              >
                Todo listo, {firstName}
              </h1>
              <p className={styles.lead}>
                {progress.ready
                  ? 'Tus intereses están guardados y tu perfil está completo. Elige por dónde seguir.'
                  : progress.interestsDone
                    ? 'Tus intereses están guardados. El perfil quedó pendiente: puedes completarlo cuando quieras en Mi perfil.'
                    : 'Tu perfil está completo. Los intereses quedaron pendientes: elígelos cuando quieras para personalizar tus recomendaciones.'}
              </p>

              {selectedCategories.length > 0 && (
                <div className={styles.summary}>
                  <h2 className={styles.subtitle}>Tus intereses</h2>
                  <ul className={styles.chips}>
                    {selectedCategories.map((category, index) => (
                      <li key={category.id} className={styles.chip}>
                        <span aria-hidden="true">
                          {categoryEmoji(category.name, index)}{' '}
                        </span>
                        {category.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className={styles.status}>
                {progress.profileDone
                  ? profileSavedNow
                    ? describeSavedProfile(savedProfilePatch ?? {})
                    : 'Perfil completo: usamos los datos de tu cuenta.'
                  : 'Perfil pendiente.'}
              </p>

              {statusMessage !== null && (
                <p className={styles.status} role="status">
                  {statusMessage}
                </p>
              )}

              <div className={styles.actions}>
                <Button onClick={() => navigate(targets.primary)}>
                  {targets.primaryLabel}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate(targets.secondary)}
                >
                  {targets.secondaryLabel}
                </Button>
              </div>

              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.linkButton}
                  onClick={() => goToStep(1)}
                >
                  Cambiar mis intereses
                </button>
                <button
                  type="button"
                  className={styles.linkButton}
                  onClick={() => goToStep(2)}
                >
                  Completar mi perfil
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  )
}

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { BackButton } from '@/components/BackButton'
import { useApiErrorState } from '@/hooks/useApiErrorState'
import { useMessageState } from '@/hooks/useMessageState'
import { translate as t } from '@/i18n/language'
import { useLanguage } from '@/hooks/useLanguage'
import { useReportsPath } from '@/hooks/useReportsPath'
import { ApiErrorAction } from '@/components/ApiErrorAction'
import { Button } from '@/components/Button'
import { MapPreview } from '@/components/MapPreview'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { Skeleton } from '@/components/Skeleton'
import { StateMessage } from '@/components/StateMessage'
import { StatusBadge } from '@/components/StatusBadge/StatusBadge'
import { REPORT_STATUS_LABELS, REPORT_STATUS_TONES } from '@/config/roles'
import { useAuth } from '@/hooks/useAuth'
import { isApiError } from '@/services/httpClient'
import { securityReportsApi } from '@/services/securityReportsApi'
import { describeApiError } from '@/utils/errors'
import { formatDate, formatDateTime } from '@/utils/format'
import type { CommentResponse, SecurityReportResponse } from '@/types'
import styles from './reports.module.css'

type ActionKind = 'close' | 'solve'

const ACTION_COPY: Record<
  ActionKind,
  { label: string; question: string; success: string }
> = {
  close: {
    get label() { return t("Marcar como reportado") },
    get question() { return t("¿Marcar este reporte como reportado? Dejará de figurar como incidente en curso.") },
    get success() { return t("El reporte quedó marcado como reportado.") },
  },
  solve: {
    get label() { return t("Marcar como resuelto") },
    get question() { return t("¿Marcar este reporte como resuelto? El incidente se dará por atendido.") },
    get success() { return t("El reporte quedó marcado como resuelto.") },
  },
}

function resizeCommentInput(input: HTMLTextAreaElement | null) {
  if (!input || input.getClientRects().length === 0) return
  input.style.height = '0px'
  input.style.height = `${input.scrollHeight + 2}px`
}

export default function ReportDetailPage() {
  useLanguage()
  const { reportId } = useParams<{ reportId: string }>()
  const { user } = useAuth()
  const commentFieldId = useId()
  const { hash } = useLocation()
  const commentsSection = useRef<HTMLElement>(null)
  const commentInput = useRef<HTMLTextAreaElement>(null)
  const commentsPanel = useRef<HTMLDetailsElement>(null)

  const canManage =
    user?.role === 'ADMIN' || user?.role === 'DESTINATION_MANAGER'
  const backTo = useReportsPath()

  const [report, setReport] = useState<SecurityReportResponse | null>(null)
  const [comments, setComments] = useState<CommentResponse[]>([])
  const [commentCursor, setCommentCursor] = useState<string | null>(null)
  const [hasMoreComments, setHasMoreComments] = useState(false)
  const [commentDraft, setCommentDraft] = useState('')
  const [isLoading, setIsLoading] = useState(reportId !== undefined)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [isWorking, setIsWorking] = useState(false)
  const [confirming, setConfirming] = useState<ActionKind | null>(null)
  const [failedAction, setFailedAction] = useState<ActionKind | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [commentsError, setCommentsError, commentsErrorCause, setCommentsErrorFromApi] = useApiErrorState()
  const [actionError, setActionError] = useState<unknown>(null)
  const [feedback, setFeedback] = useMessageState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    if (reportId === undefined) {
      return
    }

    const id = reportId
    let cancelled = false

    async function run() {
      // Un fallo de comentarios no debe tumbar el reporte: se avisa en su tarjeta.
      const [reportResult, commentsResult] = await Promise.allSettled([
        securityReportsApi.getById(id),
        securityReportsApi.listComments(id),
      ])

      if (cancelled) return

      if (reportResult.status === 'rejected') {
        setError(() => reportResult.reason)
        setIsLoading(false)
        return
      }

      setReport(reportResult.value)
      setError(null)

      if (commentsResult.status === 'fulfilled') {
        const page = commentsResult.value

        // Una recarga trae solo la primera página: se fusiona para no perder
        // las que el usuario ya había traído con «Ver más».
        setComments((previous) => {
          const loaded = new Set(page.content.map((comment) => comment.id))
          return [...page.content, ...previous.filter((c) => !loaded.has(c.id))]
        })
        setCommentCursor(page.nextCursor)
        setHasMoreComments(page.hasNext)
        setCommentsError(null)
      } else {
        setCommentsErrorFromApi(commentsResult.reason)
      }

      setIsLoading(false)
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [reportId, reloadToken, setError, setCommentsError, setCommentsErrorFromApi])

  useEffect(() => {
    if (hash !== '#comentarios' || isLoading || report === null) return
    if (commentsPanel.current) commentsPanel.current.open = true
    commentsSection.current?.focus({ preventScroll: true })
    commentsSection.current?.scrollIntoView?.({ block: 'start' })
  }, [hash, isLoading, report?.id])

  useLayoutEffect(() => {
    const input = commentInput.current
    if (!input) return
    const resize = () => resizeCommentInput(input)
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [commentDraft, isLoading])

  function retry() {
    setIsLoading(true)
    setError(null)
    setReloadToken((value) => value + 1)
  }

  if (isLoading) {
    return (
      <div className={styles.page}>
        <Skeleton variant="text" count={4} label={t("Cargando reporte…")} />
      </div>
    )
  }

  if (report === null) {
    return (
      <div className={styles.page}>
        <BackButton to={backTo} />
        <StateMessage
          title={t("No se pudo cargar el reporte")}
          description={error === null ? t("No encontramos el reporte solicitado.") : describeApiError(error)}
          tone="error"
          action={<ApiErrorAction error={error} onRetry={retry} />}
        />
      </div>
    )
  }

  const current = report
  let nextAction: ActionKind | null = null
  if (current.status === 'ONGOING') {
    nextAction = 'close'
  } else if (current.status === 'REPORTED') {
    nextAction = 'solve'
  }

  async function transition(kind: ActionKind) {
    setIsWorking(true)
    setActionError(null)
    setFailedAction(null)
    setFeedback(null)

    try {
      await (kind === 'close'
        ? securityReportsApi.close(current.id)
        : securityReportsApi.solve(current.id))
      setConfirming(null)
      setFeedback(() => ACTION_COPY[kind].success)
      // El estado y las fechas los recalcula el backend: se recarga la ficha.
      setReloadToken((value) => value + 1)
    } catch (cause) {
      setConfirming(null)
      setFailedAction(kind)
      setActionError(() => cause)
    } finally {
      setIsWorking(false)
    }
  }

  async function loadMoreComments() {
    if (commentCursor === null) return

    setIsLoadingMore(true)
    setCommentsError(null)

    try {
      const page = await securityReportsApi.listComments(
        current.id,
        commentCursor,
      )
      setComments((previous) => [...previous, ...page.content])
      setCommentCursor(page.nextCursor)
      setHasMoreComments(page.hasNext)
    } catch (cause) {
      setCommentsErrorFromApi(cause)
    } finally {
      setIsLoadingMore(false)
    }
  }

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const content = commentDraft.trim()
    if (content === '' || isSubmittingComment) return

    setIsSubmittingComment(true)
    setCommentsError(null)

    try {
      // El autor lo toma el backend del token de sesión.
      await securityReportsApi.addComment(current.id, { content })
      const page = await securityReportsApi.listComments(current.id)
      setComments(page.content)
      setCommentCursor(page.nextCursor)
      setHasMoreComments(page.hasNext)
      setCommentDraft('')
    } catch (cause) {
      setCommentsErrorFromApi(cause)
    } finally {
      setIsSubmittingComment(false)
    }
  }

  return (
    <div className={styles.page}>
      <BackButton to={backTo} />

      <PageHeader
        title={current.title}
        description={t("Reportado por {0} el {1}{2}", [current.user.name, formatDate(
          current.createdAt,
        ), ''])}
        actions={
          <StatusBadge tone={REPORT_STATUS_TONES[current.status]}>
            {REPORT_STATUS_LABELS[current.status]}
          </StatusBadge>
        }
      />

      {error !== null && (
        <div className={styles.actionError} role="alert">
          <p className={styles.actionErrorText}>{describeApiError(error)}</p>
          <ApiErrorAction error={error} onRetry={retry} variant="outline" size="sm" />
        </div>
      )}
      {feedback !== null && (
        <p className={`${styles.feedback} ${styles.success}`} role="status">
          {feedback}
        </p>
      )}

      <div className={`${styles.layout} ${styles.reportDetailLayout}`}>
        <div className={styles.column}>
          <article className={`${styles.card} ${styles.reportSheet}`}>
            <h2 className={styles.cardTitle}>{t("Ficha del reporte")}</h2>
            <dl className={styles.details}>
              <div className={styles.detailRow}>
                <dt>{t("Autor")}</dt>
                <dd className={styles.authorMeta}>
                  <span>{current.user.name}</span>
                  <time
                    className={styles.authorDate}
                    dateTime={current.createdAt}
                    aria-label={`${t('Creado')}: ${formatDateTime(current.createdAt)}`}
                  >
                    {formatDateTime(current.createdAt)}
                  </time>
                </dd>
              </div>
              <div className={styles.detailRow}>
                <dt>{t("Ubicación")}</dt>
                <dd>
                  {current.location === null ? t('Sin ubicación registrada') : (
                    <MapPreview
                      latitude={current.location.latitude}
                      longitude={current.location.longitude}
                      label={current.title}
                      zoomControls
                    />
                  )}
                </dd>
              </div>
              {current.updatedAt !== current.createdAt && (
                <div className={styles.detailRow}>
                  <dt>{t("Última actualización")}</dt>
                  <dd>{formatDateTime(current.updatedAt)}</dd>
                </div>
              )}
            </dl>
          </article>

          {current.photosUrls.length > 0 && (
            <article className={`${styles.card} ${styles.reportPhotos}`}>
              <h2 className={styles.cardTitle}>
                {t("Fotos (")}{current.photosUrls.length})
              </h2>
              <ul className={styles.gallery}>
                {current.photosUrls.map((url, index) => (
                  <li key={`${url}-${index}`} className={styles.galleryItem}>
                    <a
                      className={styles.galleryLink}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <img
                        className={styles.galleryImage}
                        src={url}
                        alt={t("Foto {0} del reporte", [index + 1])}
                        loading="lazy"
                      />
                    </a>
                  </li>
                ))}
              </ul>
            </article>
          )}
        </div>

        <div className={styles.column}>
          <article id="comentarios" ref={commentsSection} tabIndex={-1}
            aria-labelledby="comments-title" className={`${styles.card} ${styles.commentsSection}`}>
            <details ref={commentsPanel} open className={styles.commentsPanel}
              onToggle={event => {
                if (event.currentTarget.open) resizeCommentInput(commentInput.current)
              }}>
            <summary className={styles.commentsSummary}>
            <h2 id="comments-title" className={styles.commentsTitle}>
              {t("Comentarios (")}{comments.length}
              {hasMoreComments ? '+' : ''})
            </h2>
            <svg className={styles.commentsChevron} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
            </summary>
            <div className={styles.commentsBody}>
            <div className={styles.commentsScroll} role="region" aria-label={t("Lista de comentarios")} tabIndex={0}>



            {comments.length === 0 && commentsError === null && (
              <p className={styles.helper}>
                {t("Todavía no hay comentarios en este reporte.")}</p>
            )}

            {comments.length > 0 && (
              <ul className={styles.commentList}>
                {comments.map((item) => (
                  <li key={item.id} className={styles.comment}>
                    <p className={styles.commentAuthor}>
                      {item.user.name}
                      {item.createdAt !== '' && (
                        <span className={styles.commentDate}>
                          {' · '}
                          {formatDateTime(item.createdAt)}
                        </span>
                      )}
                    </p>
                    <p className={styles.commentText}>{item.content}</p>
                  </li>
                ))}
              </ul>
            )}

            {hasMoreComments && (
              <div className={styles.actions}>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isLoadingMore}
                  onClick={() => void loadMoreComments()}
                >
                  {isLoadingMore ? t("Cargando…") : t("Ver más comentarios")}
                </Button>
              </div>
            )}

            </div>
            {commentsError !== null && (
              <p className={`${styles.feedback} ${styles.error}`} role="alert">
                {commentsError}
              </p>
            )}
            {isApiError(commentsErrorCause) && commentsErrorCause.status === 401 && (
              <ApiErrorAction error={commentsErrorCause} onRetry={retry} variant="outline" size="sm" />
            )}
            <form className={styles.commentForm} onSubmit={submitComment}>
              <label className={styles.fieldLabel} htmlFor={commentFieldId}>
                {t("Añadir un comentario")}</label>
              <div className={styles.commentComposer}>
              <textarea
                ref={commentInput}
                rows={1}
                id={commentFieldId}
                className={`${styles.textarea} ${styles.commentInput}`}
                value={commentDraft}
                maxLength={2000}
                placeholder={t("Escribe un comentario…")}
                onChange={(changeEvent) =>
                  setCommentDraft(changeEvent.target.value)
                }
              />
                <Button type="submit" variant="accent" className={styles.commentSend}
                  aria-label={isSubmittingComment ? t("Publicando…") : t("Publicar comentario")}
                  title={t("Publicar comentario")}
                  aria-busy={isSubmittingComment}
                  disabled={isSubmittingComment || commentDraft.trim() === ''}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                    <path d="m22 2-7 20-4-9-9-4 20-7ZM22 2 11 13" />
                  </svg>
                </Button>
              </div>
            </form>
            </div>
            </details>
          </article>

          {canManage && (
            <article className={styles.card}>
              <h2 className={styles.cardTitle}>{t("Gestión del estado")}</h2>

              {nextAction === null ? (
                <p className={styles.helper}>
                  {t("Este reporte está resuelto; no quedan acciones de estado.")}</p>
              ) : confirming === nextAction ? (
                <div className={styles.confirm}>
                  <p className={styles.confirmText}>
                    {ACTION_COPY[nextAction].question}
                  </p>
                  <div className={styles.actions}>
                    <Button
                      variant="primary"
                      disabled={isWorking}
                      onClick={() => void transition(nextAction)}
                    >
                      {isWorking ? t("Enviando…") : t("Sí, continuar")}
                    </Button>
                    <Button
                      variant="outline"
                      disabled={isWorking}
                      onClick={() => setConfirming(null)}
                    >
                      {t("Cancelar")}</Button>
                  </div>
                </div>
              ) : (
                <div className={styles.actions}>
                  <Button
                    variant="primary"
                    disabled={isWorking}
                    onClick={() => {
                      setActionError(null)
                      setFailedAction(null)
                      setConfirming(nextAction)
                    }}
                  >
                    {ACTION_COPY[nextAction].label}
                  </Button>
                </div>
              )}

              {actionError !== null && failedAction !== null && (
                <div className={styles.actionError} role="alert">
                  <p className={styles.actionErrorText}>{describeApiError(actionError)}</p>
                  <ApiErrorAction error={actionError} variant="outline" size="sm" disabled={isWorking}
                    onRetry={() => void transition(failedAction)} />
                </div>
              )}
            </article>
          )}

          <article className={styles.card}>
            <h2 className={styles.cardTitle}>{t("Historial")}</h2>
            <ol className={styles.timeline}>
              <li className={styles.timelineItem}>
                <span className={styles.timelineDot} aria-hidden="true" />
                <p className={styles.timelineTitle}>{t("Reporte creado")}</p>
                <p className={styles.timelineDate}>
                  {formatDateTime(current.createdAt)}
                </p>
              </li>
              {current.updatedAt !== current.createdAt && (
                <li className={styles.timelineItem}>
                  <span className={styles.timelineDot} aria-hidden="true" />
                  <p className={styles.timelineTitle}>{t("Última actualización")}</p>
                  <p className={styles.timelineDate}>
                    {formatDateTime(current.updatedAt)}
                  </p>
                </li>
              )}
            </ol>
          </article>
        </div>
      </div>
    </div>
  )
}

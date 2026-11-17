import { useEffect, useId, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMessageState } from '@/hooks/useMessageState'
import { translate as t } from '@/i18n/language'
import { useLanguage } from '@/hooks/useLanguage'
import { useReportsPath } from '@/hooks/useReportsPath'
import { Button } from '@/components/Button'
import { MapPreview } from '@/components/MapPreview'
import { PageHeader } from '@/components/PageHeader/PageHeader'
import { Skeleton } from '@/components/Skeleton'
import { StateMessage } from '@/components/StateMessage'
import { StatusBadge } from '@/components/StatusBadge/StatusBadge'
import { REPORT_STATUS_LABELS, REPORT_STATUS_TONES } from '@/config/roles'
import { useAuth } from '@/hooks/useAuth'
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

export default function ReportDetailPage() {
  useLanguage()
  const { reportId } = useParams<{ reportId: string }>()
  const { user } = useAuth()
  const commentFieldId = useId()

  const canManage =
    user?.role === 'ADMIN' || user?.role === 'DESTINATION_MANAGER'
  const backTo = useReportsPath()
  const backLabel = canManage
    ? t("Volver a gestión de reportes")
    : t("Volver a mis reportes")

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
  const [error, setError] = useMessageState<string | null>(null)
  const [commentsError, setCommentsError] = useMessageState<string | null>(null)
  const [actionError, setActionError] = useMessageState<string | null>(null)
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
        setError(() => describeApiError(reportResult.reason))
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
        setCommentsError(() => describeApiError(commentsResult.reason))
      }

      setIsLoading(false)
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [reportId, reloadToken, setError, setCommentsError])

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
        <Link to={backTo} className={styles.back}>
          ← {backLabel}
        </Link>
        <StateMessage
          title={t("No se pudo cargar el reporte")}
          description={error ?? t("No encontramos el reporte solicitado.")}
          tone="error"
          action={<Button onClick={retry}>{t("Reintentar")}</Button>}
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
      setActionError(() => describeApiError(cause))
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
      setCommentsError(() => describeApiError(cause))
    } finally {
      setIsLoadingMore(false)
    }
  }

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const content = commentDraft.trim()
    if (content === '') return

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
      setCommentsError(() => describeApiError(cause))
    } finally {
      setIsSubmittingComment(false)
    }
  }

  return (
    <div className={styles.page}>
      <Link to={backTo} className={styles.back}>
        ← {backLabel}
      </Link>

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
          <p className={styles.actionErrorText}>{error}</p>
          <Button variant="outline" size="sm" onClick={retry}>
            {t("Reintentar")}</Button>
        </div>
      )}
      {feedback !== null && (
        <p className={`${styles.feedback} ${styles.success}`} role="status">
          {feedback}
        </p>
      )}

      <div className={styles.layout}>
        <div className={styles.column}>
          <article className={styles.card}>
            <h2 className={styles.cardTitle}>{t("Descripción")}</h2>
            {current.description.trim() === '' ? (
              <p className={styles.helper}>
                {t("El reporte no incluye una descripción.")}</p>
            ) : (
              <p className={styles.text}>{current.description}</p>
            )}
          </article>

          {current.photosUrls.length > 0 && (
            <article className={styles.card}>
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

          <article className={styles.card}>
            <h2 className={styles.cardTitle}>
              {t("Comentarios (")}{comments.length}
              {hasMoreComments ? '+' : ''})
            </h2>

            {commentsError !== null && (
              <p className={`${styles.feedback} ${styles.error}`} role="alert">
                {commentsError}
              </p>
            )}

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

            <form className={styles.commentForm} onSubmit={submitComment}>
              <label className={styles.fieldLabel} htmlFor={commentFieldId}>
                {t("Añadir un comentario")}</label>
              <textarea
                id={commentFieldId}
                className={styles.textarea}
                value={commentDraft}
                maxLength={2000}
                placeholder={t("Describe lo que verificaste o el avance del caso…")}
                onChange={(changeEvent) =>
                  setCommentDraft(changeEvent.target.value)
                }
              />
              <div className={styles.actions}>
                <Button
                  type="submit"
                  variant="accent"
                  disabled={isSubmittingComment || commentDraft.trim() === ''}
                >
                  {isSubmittingComment ? t("Publicando…") : t("Publicar comentario")}
                </Button>
              </div>
            </form>
          </article>
        </div>

        <div className={styles.column}>
          <article className={styles.card}>
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
                  <p className={styles.actionErrorText}>{actionError}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isWorking}
                    onClick={() => void transition(failedAction)}
                  >
                    {t("Reintentar")}</Button>
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

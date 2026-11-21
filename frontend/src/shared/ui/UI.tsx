import {
  useEffect,
  useId,
  useRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react'
import { AlertCircle, CheckCircle2, LoaderCircle, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  icon?: ReactNode
}

export function Button({
  children,
  variant = 'primary',
  icon,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button className={`button button--${variant} ${className}`} {...props}>
      {icon}
      {children}
    </button>
  )
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
  suffix?: ReactNode
}

export function Field({ label, error, suffix, id, className = '', ...props }: FieldProps) {
  const generatedId = useId()
  const fieldId = id || props.name || `campo-${generatedId.replace(/:/g, '')}`
  return (
    // O erro fica fora do <label> para não entrar no nome acessível do campo;
    // ele é anunciado como descrição, via aria-describedby.
    <div className={`field ${className}`}>
      <label className="field__label" htmlFor={fieldId}>
        {label}
      </label>
      <span className={`field__control ${error ? 'field__control--error' : ''}`}>
        <input
          id={fieldId}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${fieldId}-error` : undefined}
          {...props}
        />
        {suffix}
      </span>
      {error && (
        <span className="field__error" id={`${fieldId}-error`}>
          <AlertCircle size={16} aria-hidden="true" /> {error}
        </span>
      )}
    </div>
  )
}

export function Brand({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  return (
    <div
      className={`brand ${light ? 'brand--light' : ''} ${compact ? 'brand--compact' : ''}`}
      aria-label="Mo$chos Pecuária"
    >
      <div className="brand__ears" aria-hidden="true">
        <span />
        <i />
        <span />
      </div>
      <div className="brand__word">
        MO<span>$</span>CHOS
      </div>
      {!compact && <div className="brand__sub">PECUÁRIA</div>}
    </div>
  )
}

export type ToastAction = { label: string; onClick: () => void }

export function Toast({
  message,
  onClose,
  action,
  tone = 'success',
}: {
  message: string | null
  onClose: () => void
  /** Ação opcional no aviso (ex.: { label: 'Desfazer', onClick: desfazer }). */
  action?: ToastAction
  /** 'error' usa ícone de alerta; padrão 'success'. */
  tone?: 'success' | 'error' | 'info'
}) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          className={`toast toast--${tone}`}
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, x: '-50%', y: 18 }}
          animate={{ opacity: 1, x: '-50%', y: 0 }}
          exit={{ opacity: 0, x: '-50%', y: 12 }}
        >
          {tone === 'error' ? (
            <AlertCircle size={22} aria-hidden="true" />
          ) : (
            <CheckCircle2 size={22} aria-hidden="true" />
          )}
          <span>{message}</span>
          {action && (
            <button
              type="button"
              className="toast__action"
              onClick={() => {
                action.onClick()
                onClose()
              }}
            >
              {action.label}
            </button>
          )}
          <button className="icon-button" onClick={onClose} aria-label="Fechar aviso">
            <X size={19} aria-hidden="true" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const stateDefaults = {
  loading: {
    title: 'Buscando seus dados...',
    text: 'Isso deve levar só um instante.',
    actionLabel: '',
  },
  error: {
    title: 'Não conseguimos carregar agora',
    text: 'Sua internet pode ter oscilado. Seus dados continuam seguros.',
    actionLabel: 'Tentar de novo',
  },
  empty: {
    title: 'Ainda não há nada por aqui',
    text: 'Comece pelo primeiro registro para acompanhar tudo com clareza.',
    actionLabel: 'Começar agora',
  },
}

export function StateView({
  type,
  onRetry,
  onAction,
  title,
  text,
  actionLabel,
}: {
  type: 'loading' | 'error' | 'empty'
  /** Ação do botão (mantido por compatibilidade; o mesmo que onAction). */
  onRetry?: () => void
  onAction?: () => void
  title?: string
  text?: string
  /** Texto do botão. Passe '' para esconder o botão. */
  actionLabel?: string
}) {
  const copy = stateDefaults[type]
  const heading = title ?? copy.title
  const body = text ?? copy.text
  const label = actionLabel ?? copy.actionLabel
  const action = onAction ?? onRetry
  if (type === 'loading') {
    return (
      <div className="state-view" role="status" aria-live="polite">
        <LoaderCircle className="spin" size={36} aria-hidden="true" />
        <h2>{heading}</h2>
        <p>{body}</p>
        <div className="skeleton-row" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
      </div>
    )
  }
  if (type === 'error') {
    return (
      <div className="state-view" role="alert">
        <AlertCircle size={40} aria-hidden="true" />
        <h2>{heading}</h2>
        <p>{body}</p>
        {label && <Button onClick={action}>{label}</Button>}
      </div>
    )
  }
  return (
    <div className="state-view">
      <div className="empty-illustration" aria-hidden="true">
        <span />
        <i />
      </div>
      <h2>{heading}</h2>
      <p>{body}</p>
      {label && <Button onClick={action}>{label}</Button>}
    </div>
  )
}

/**
 * Diálogos abertos, do mais antigo ao mais recente. Só o do topo responde ao Esc e ao Tab:
 * com o termo aberto sobre o cadastro, o Esc fecha só o termo.
 */
const openModals: symbol[] = []

/** Largura em que o diálogo vira folha inferior (mesmo corte do CSS em index.css). */
const SHEET_QUERY = '(max-width: 760px)'

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  const titleId = `modal-titulo-${useId().replace(/:/g, '')}`
  const dialogRef = useRef<HTMLElement>(null)
  const restoreFocusRef = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  // No celular o diálogo é uma folha presa ao rodapé (CSS) e entra de baixo para cima.
  const sheet = typeof window !== 'undefined' && Boolean(window.matchMedia?.(SHEET_QUERY).matches)

  useEffect(() => {
    if (!open) return
    const token = Symbol('modal')
    openModals.push(token)
    restoreFocusRef.current = document.activeElement as HTMLElement
    const dialog = dialogRef.current
    const focusable = dialog?.querySelector<HTMLElement>(
      "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [href], [tabindex]:not([tabindex='-1'])",
    )
    focusable?.focus()
    function handleKeydown(event: KeyboardEvent) {
      if (openModals[openModals.length - 1] !== token) return
      if (event.key === 'Escape') {
        event.stopPropagation()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab' || !dialog) return
      const items = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [href], [tabindex]:not([tabindex='-1'])",
        ),
      )
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeydown)
    return () => {
      document.removeEventListener('keydown', handleKeydown)
      openModals.splice(openModals.indexOf(token), 1)
      restoreFocusRef.current?.focus()
    }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={onClose}
        >
          <motion.section
            ref={dialogRef}
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={sheet ? { y: '100%' } : { opacity: 0, y: 24, scale: 0.98 }}
            animate={sheet ? { y: 0 } : { opacity: 1, y: 0, scale: 1 }}
            exit={sheet ? { y: '100%' } : { opacity: 0, y: 16 }}
            transition={{ duration: sheet ? 0.28 : 0.22, ease: 'easeOut' }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal__header">
              <h2 id={titleId}>{title}</h2>
              <button className="icon-button" onClick={onClose} aria-label="Fechar">
                <X aria-hidden="true" />
              </button>
            </div>
            {children}
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

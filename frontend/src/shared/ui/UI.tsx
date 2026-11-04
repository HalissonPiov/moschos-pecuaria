import { useEffect, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, LoaderCircle, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  icon?: ReactNode;
};

export function Button({
  children,
  variant = "primary",
  icon,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button className={`button button--${variant} ${className}`} {...props}>
      {icon}
      {children}
    </button>
  );
}

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  suffix?: ReactNode;
};

export function Field({ label, error, suffix, id, className = "", ...props }: FieldProps) {
  const fieldId = id || props.name;
  return (
    <label className={`field ${className}`} htmlFor={fieldId}>
      <span className="field__label">{label}</span>
      <span className={`field__control ${error ? "field__control--error" : ""}`}>
        <input id={fieldId} aria-invalid={Boolean(error)} aria-describedby={error ? `${fieldId}-error` : undefined} {...props} />
        {suffix}
      </span>
      {error && (
        <span className="field__error" id={`${fieldId}-error`}>
          <AlertCircle size={16} aria-hidden="true" /> {error}
        </span>
      )}
    </label>
  );
}

export function Brand({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  return (
    <div className={`brand ${light ? "brand--light" : ""} ${compact ? "brand--compact" : ""}`} aria-label="Mo$chos Pecuária">
      <div className="brand__ears" aria-hidden="true">
        <span />
        <i />
        <span />
      </div>
      <div className="brand__word">MO<span>$</span>CHOS</div>
      {!compact && <div className="brand__sub">PECUÁRIA</div>}
    </div>
  );
}

export function Toast({
  message,
  onClose,
}: {
  message: string | null;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          className="toast"
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
        >
          <CheckCircle2 size={22} aria-hidden="true" />
          <span>{message}</span>
          <button className="icon-button" onClick={onClose} aria-label="Fechar aviso">
            <X size={19} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function StateView({
  type,
  onRetry,
}: {
  type: "loading" | "error" | "empty";
  onRetry?: () => void;
}) {
  if (type === "loading") {
    return (
      <div className="state-view" role="status">
        <LoaderCircle className="spin" size={36} />
        <h2>Buscando seus dados...</h2>
        <p>Isso deve levar só um instante.</p>
        <div className="skeleton-row"><i /><i /><i /></div>
      </div>
    );
  }
  if (type === "error") {
    return (
      <div className="state-view">
        <AlertCircle size={40} />
        <h2>Não conseguimos carregar agora</h2>
        <p>Sua internet pode ter oscilado. Seus dados continuam seguros.</p>
        <Button onClick={onRetry}>Tentar de novo</Button>
      </div>
    );
  }
  return (
    <div className="state-view">
      <div className="empty-illustration" aria-hidden="true"><span /><i /></div>
      <h2>Ainda não há nada por aqui</h2>
      <p>Comece pelo primeiro registro para acompanhar tudo com clareza.</p>
      <Button onClick={onRetry}>Começar agora</Button>
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement as HTMLElement;
    const dialog = dialogRef.current;
    const focusable = dialog?.querySelector<HTMLElement>("button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [href], [tabindex]:not([tabindex='-1'])");
    focusable?.focus();
    function handleKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") onCloseRef.current();
      if (event.key !== "Tab" || !dialog) return;
      const items = Array.from(dialog.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [href], [tabindex]:not([tabindex='-1'])"));
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", handleKeydown);
    return () => {
      document.removeEventListener("keydown", handleKeydown);
      restoreFocusRef.current?.focus();
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.section
            ref={dialogRef}
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.22 }}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal__header">
              <h2 id="modal-title">{title}</h2>
              <button className="icon-button" onClick={onClose} aria-label="Fechar">
                <X />
              </button>
            </div>
            {children}
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

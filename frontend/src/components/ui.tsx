import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "../lib/utils";

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <svg className={cx("h-4 w-4 animate-spin", className)} viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z" />
    </svg>
  );
}

export function Button({
  children,
  className,
  variant = "primary",
  loading = false,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  loading?: boolean;
}) {
  const styles = {
    primary: "bg-accent text-white hover:bg-[#cc5c14] active:bg-[#b45112]",
    secondary: "bg-navy text-white hover:bg-navy-2 active:bg-[#0a1622]",
    danger: "bg-[#b42318] text-white hover:bg-[#912018] active:bg-[#7a1b15]",
    ghost: "bg-white text-ink border border-line hover:bg-[#f8fafc] active:bg-[#eef2f6]",
  } as const;
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-[10px] px-4 py-2.5 text-sm font-semibold transition duration-200 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
        "disabled:pointer-events-none disabled:opacity-50",
        styles[variant],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
  hint,
  error,
  htmlFor,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  error?: string;
  htmlFor?: string;
}) {
  return (
    <div className="block space-y-1.5">
      <label htmlFor={htmlFor} className="block text-[13px] font-semibold text-[#3d4d5c]">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-[#b42318]" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function inputClass(extra = "") {
  return cx(
    "w-full rounded-[10px] border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none transition duration-200",
    "placeholder:text-[#8a96a3]",
    "hover:border-[#c5ced8]",
    "focus:border-accent focus:ring-2 focus:ring-accent/20",
    extra,
  );
}

export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4" onClick={onClose}>
      <div
        className="lm-pop max-h-[90vh] w-full max-w-lg overflow-auto rounded-[10px] border border-line bg-white p-5 shadow-lg"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 id="modal-title" className="text-lg font-semibold">
            {title}
          </h3>
          <button className="text-sm text-muted hover:text-ink" onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function PageHeader({
  kicker,
  title,
  description,
  actions,
}: {
  kicker?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        {kicker ? <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">{kicker}</p> : null}
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p> : null}
      </div>
      {actions}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={cx("animate-pulse rounded-[10px] bg-[#e8edf2]", className)} />;
}

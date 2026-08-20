import { useState, type ReactNode } from "react";
import { Info } from "lucide-react";
import { cx } from "../lib/utils";

export function Tooltip({
  label,
  children,
}: {
  label: string;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        className="inline-flex text-muted transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
        aria-label={label}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
      >
        {children ?? <Info size={14} />}
      </button>
      {open ? (
        <span
          role="tooltip"
          className="lm-pop absolute bottom-full left-1/2 z-20 mb-2 w-56 -translate-x-1/2 rounded-[10px] border border-line bg-navy px-3 py-2 text-left text-xs leading-5 text-white shadow-lg"
        >
          {label}
        </span>
      ) : null}
    </span>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[10px] border border-dashed border-line bg-white px-6 py-10 text-center">
      {icon ? <div className="mb-3 flex justify-center text-muted">{icon}</div> : null}
      <p className="font-semibold text-ink">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted">{description}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function CoverageBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        active ? "status-AVAILABLE" : "status-COMING_SOON",
      )}
    >
      <span className={cx("h-1.5 w-1.5 rounded-full", active ? "bg-[#1d7a36]" : "bg-[#c27803]")} />
      {active ? "Available" : "Coming soon"}
    </span>
  );
}

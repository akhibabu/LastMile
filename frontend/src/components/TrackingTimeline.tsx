import { format } from "date-fns";
import type { StatusHistory } from "../types";
import { StatusBadge } from "./StatusBadge";

export function TrackingTimeline({ items }: { items: StatusHistory[] }) {
  if (!items.length) {
    return <p className="text-sm text-[#5c6b78]">No tracking events yet.</p>;
  }

  return (
    <ol className="space-y-0">
      {items.map((item, index) => (
        <li key={item.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <span className="mt-1 h-2.5 w-2.5 rounded-full bg-accent" />
            {index < items.length - 1 ? <span className="w-px flex-1 bg-line" /> : null}
          </div>
          <div className="pb-6">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={item.status} />
              <span className="num text-xs text-muted">
                {format(new Date(item.timestamp), "dd MMM yyyy, HH:mm")}
              </span>
            </div>
            <p className="mt-1 text-sm">
              {item.actor ? `${item.actor.name} (${item.actor.role.toLowerCase()})` : "System"}
            </p>
            {item.note ? <p className="mt-1 text-sm text-[#5c6b78]">{item.note}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

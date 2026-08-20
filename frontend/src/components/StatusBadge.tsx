import type { OrderStatus } from "../types";
import { cx } from "../lib/utils";

const labels: Record<OrderStatus, string> = {
  CREATED: "Created",
  ASSIGNED: "Assigned",
  PICKED_UP: "Picked up",
  IN_TRANSIT: "In transit",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  FAILED: "Failed",
  RESCHEDULED: "Rescheduled",
  CANCELLED: "Cancelled",
};

export function StatusBadge({ status }: { status: OrderStatus | string }) {
  return (
    <span className={cx("inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold", `status-${status}`)}>
      {labels[status as OrderStatus] ?? status.replaceAll("_", " ")}
    </span>
  );
}

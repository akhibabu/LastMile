export type OrderStatus =
  | "CREATED"
  | "ASSIGNED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "FAILED"
  | "RESCHEDULED"
  | "CANCELLED";

export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  CREATED: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["PICKED_UP", "CANCELLED"],
  PICKED_UP: ["IN_TRANSIT", "CANCELLED"],
  IN_TRANSIT: ["OUT_FOR_DELIVERY"],
  OUT_FOR_DELIVERY: ["DELIVERED", "FAILED"],
  FAILED: ["RESCHEDULED", "CANCELLED"],
  RESCHEDULED: ["ASSIGNED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

export const AGENT_ALLOWED_TRANSITIONS: Partial<Record<OrderStatus, OrderStatus[]>> = {
  ASSIGNED: ["PICKED_UP"],
  PICKED_UP: ["IN_TRANSIT"],
  IN_TRANSIT: ["OUT_FOR_DELIVERY"],
  OUT_FOR_DELIVERY: ["DELIVERED", "FAILED"],
};

export const FAILURE_REQUIRING_STATUSES: OrderStatus[] = ["FAILED"];

export function canTransition(
  from: OrderStatus,
  to: OrderStatus,
  options: { override?: boolean } = {},
): boolean {
  if (from === to) return false;
  if (options.override) return true;
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function assertTransition(
  from: OrderStatus,
  to: OrderStatus,
  options: { override?: boolean; actorRole?: "ADMIN" | "AGENT" | "CUSTOMER" } = {},
): void {
  if (options.override && options.actorRole === "ADMIN") {
    if (from === to) {
      throw new Error(`Order is already ${to}`);
    }
    return;
  }

  if (options.actorRole === "AGENT") {
    const allowed = AGENT_ALLOWED_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw new Error(`Agents cannot change status from ${from} to ${to}`);
    }
    return;
  }

  if (!canTransition(from, to, { override: false })) {
    throw new Error(`Invalid status transition from ${from} to ${to}`);
  }
}

export function isTerminalStatus(status: OrderStatus): boolean {
  return status === "DELIVERED" || status === "CANCELLED";
}

export function isActiveStatus(status: OrderStatus): boolean {
  return !["DELIVERED", "CANCELLED", "FAILED"].includes(status);
}

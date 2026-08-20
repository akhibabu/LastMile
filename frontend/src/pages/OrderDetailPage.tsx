import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import { StatusBadge } from "../components/StatusBadge";
import { TrackingTimeline } from "../components/TrackingTimeline";
import { Button, Field, inputClass, Modal } from "../components/ui";
import { inr, kg } from "../lib/utils";
import { useAuth } from "../lib/auth";
import { formatApiError } from "../lib/errors";
import type { AgentProfile, Order } from "../types";

const agentActions: Record<string, Array<{ label: string; status: string; danger?: boolean }>> = {
  ASSIGNED: [{ label: "Mark picked up", status: "PICKED_UP" }],
  PICKED_UP: [{ label: "Mark in transit", status: "IN_TRANSIT" }],
  IN_TRANSIT: [{ label: "Mark out for delivery", status: "OUT_FOR_DELIVERY" }],
  OUT_FOR_DELIVERY: [
    { label: "Mark delivered", status: "DELIVERED" },
    { label: "Mark failed", status: "FAILED", danger: true },
  ],
};

export function OrderDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [failOpen, setFailOpen] = useState(false);
  const [reason, setReason] = useState("CUSTOMER_UNAVAILABLE");
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [assignAgentId, setAssignAgentId] = useState("");
  const [overrideStatus, setOverrideStatus] = useState("ASSIGNED");

  const orderQuery = useQuery({
    queryKey: ["order", id],
    queryFn: async () => (await api.get(`/orders/${id}`)).data.data as Order,
  });

  const agentsQuery = useQuery({
    queryKey: ["available-agents"],
    enabled: user?.role === "ADMIN",
    queryFn: async () => (await api.get("/agents/available")).data.data as AgentProfile[],
  });

  const statusMut = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => (await api.post(`/orders/${id}/status`, payload)).data.data,
    onSuccess: () => {
      toast.success("Status updated");
      void qc.invalidateQueries({ queryKey: ["order", id] });
    },
    onError: (error: Error) => toast.error(formatApiError(error)),
  });

  const assignMut = useMutation({
    mutationFn: async () => (await api.post(`/orders/${id}/assign`, { agentId: assignAgentId })).data,
    onSuccess: () => {
      toast.success("Agent assigned");
      void qc.invalidateQueries({ queryKey: ["order", id] });
    },
    onError: (error: Error) => toast.error(formatApiError(error)),
  });

  const autoMut = useMutation({
    mutationFn: async () => (await api.post(`/orders/${id}/auto-assign`)).data.data,
    onSuccess: (data: { assignment?: { agent: { name: string }; reason: string; distanceKm: number | null } }) => {
      const a = data.assignment;
      toast.success(a ? `Assigned ${a.agent.name} (${a.reason}${a.distanceKm != null ? `, ${a.distanceKm} km` : ""})` : "Assigned");
      void qc.invalidateQueries({ queryKey: ["order", id] });
    },
    onError: (error: Error) => toast.error(formatApiError(error)),
  });

  const rescheduleMut = useMutation({
    mutationFn: async () =>
      (await api.post(`/orders/${id}/reschedule`, { scheduledDeliveryDate: new Date(rescheduleDate).toISOString() })).data,
    onSuccess: () => {
      toast.success("Delivery rescheduled");
      void qc.invalidateQueries({ queryKey: ["order", id] });
    },
    onError: (error: Error) => toast.error(formatApiError(error)),
  });

  if (orderQuery.isLoading) return <p className="text-sm text-muted">Loading shipment…</p>;
  if (orderQuery.isError || !orderQuery.data) return <p className="text-[#b42318]">Could not load this order.</p>;

  const order = orderQuery.data;
  const actions = user?.role === "AGENT" ? agentActions[order.status] ?? [] : [];

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-sm text-[#5c6b78]">{order.orderNumber}</p>
            <h1 className="text-2xl font-semibold">Shipment tracking</h1>
          </div>
          <StatusBadge status={order.status} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="stat-card">
            <p className="text-xs uppercase tracking-wide text-[#8a7b66]">Pickup</p>
            <p className="mt-2 font-medium">{order.pickupAddress}</p>
            <p className="text-sm text-[#5c6b78]">{order.pickupZone?.code} · {order.pickupPincode}</p>
          </div>
          <div className="stat-card">
            <p className="text-xs uppercase tracking-wide text-[#8a7b66]">Drop</p>
            <p className="mt-2 font-medium">{order.dropAddress}</p>
            <p className="text-sm text-[#5c6b78]">{order.dropZone?.code} · {order.dropPincode}</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="stat-card"><p className="text-sm text-[#5c6b78]">Actual</p><p className="text-xl font-semibold">{kg(order.actualWeight)}</p></div>
          <div className="stat-card"><p className="text-sm text-[#5c6b78]">Volumetric</p><p className="text-xl font-semibold">{kg(order.volumetricWeight)}</p></div>
          <div className="stat-card"><p className="text-sm text-[#5c6b78]">Billable</p><p className="text-xl font-semibold">{kg(order.billableWeight)}</p></div>
        </div>
        <div className="stat-card">
          <p className="text-sm text-[#5c6b78]">{order.orderType} · {order.paymentType}</p>
          <p className="mt-1 text-2xl font-semibold">{inr(order.totalCharge)}</p>
          <p className="text-sm">Shipping {inr(order.shippingCharge)} + COD {inr(order.codSurcharge)}</p>
          <p className="mt-2 text-sm">Agent: {order.assignedAgent?.user?.name ?? "Unassigned"}</p>
          {order.customer ? <p className="text-sm">Customer: {order.customer.name} · {order.customer.phone ?? order.customer.email}</p> : null}
        </div>
        <section className="stat-card">
          <h2 className="mb-4 text-lg font-semibold">Immutable timeline</h2>
          <TrackingTimeline items={order.statusHistory ?? []} />
        </section>
        {order.attempts?.length ? (
          <section className="stat-card">
            <h2 className="mb-3 text-lg font-semibold">Delivery attempts</h2>
            <ul className="space-y-2 text-sm">
              {order.attempts.map((attempt) => (
                <li key={attempt.id} className="rounded-[10px] bg-[#f4f6f8] px-3 py-2">
                  Attempt {attempt.attemptNumber}: {attempt.status}
                  {attempt.reason ? ` · ${attempt.reason}` : ""}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
      <aside className="space-y-4">
        {user?.role === "AGENT" ? (
          <div className="stat-card space-y-3">
            <h3 className="font-semibold">Allowed actions</h3>
            {actions.map((action) => (
              <Button
                key={action.status}
                variant={action.danger ? "danger" : "primary"}
                className="w-full"
                onClick={() => (action.status === "FAILED" ? setFailOpen(true) : statusMut.mutate({ status: action.status }))}
              >
                {action.label}
              </Button>
            ))}
            {!actions.length ? <p className="text-sm text-[#5c6b78]">No agent actions for this status.</p> : null}
          </div>
        ) : null}

        {user?.role === "CUSTOMER" && order.status === "FAILED" ? (
          <div className="stat-card space-y-3">
            <h3 className="font-semibold">Reschedule failed delivery</h3>
            <Field label="New delivery date">
              <input className={inputClass()} type="datetime-local" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} />
            </Field>
            <Button className="w-full" disabled={!rescheduleDate || rescheduleMut.isPending} onClick={() => rescheduleMut.mutate()}>
              Reschedule
            </Button>
          </div>
        ) : null}

        {user?.role === "ADMIN" ? (
          <div className="stat-card space-y-3">
            <h3 className="font-semibold">Admin assignment</h3>
            <Button className="w-full" onClick={() => autoMut.mutate()} disabled={autoMut.isPending}>
              Auto-assign nearest agent
            </Button>
            <Field label="Manual assign">
              <select className={inputClass()} value={assignAgentId} onChange={(e) => setAssignAgentId(e.target.value)}>
                <option value="">Select available agent</option>
                {agentsQuery.data?.map((agent) => (
                  <option key={agent.id} value={agent.id}>{agent.user?.name}</option>
                ))}
              </select>
            </Field>
            <Button variant="secondary" className="w-full" disabled={!assignAgentId} onClick={() => assignMut.mutate()}>
              Assign selected agent
            </Button>
            <Field label="Override status">
              <select className={inputClass()} value={overrideStatus} onChange={(e) => setOverrideStatus(e.target.value)}>
                {["CREATED","ASSIGNED","PICKED_UP","IN_TRANSIT","OUT_FOR_DELIVERY","DELIVERED","FAILED","RESCHEDULED","CANCELLED"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Button variant="ghost" className="w-full" onClick={() => statusMut.mutate({ status: overrideStatus, override: true, note: "Admin override" })}>
              Override
            </Button>
          </div>
        ) : null}
      </aside>

      {failOpen ? (
        <Modal title="Mark delivery failed" onClose={() => setFailOpen(false)}>
          <div className="space-y-3">
            <Field label="Failure reason">
              <select className={inputClass()} value={reason} onChange={(e) => setReason(e.target.value)}>
                <option value="CUSTOMER_UNAVAILABLE">Customer unavailable</option>
                <option value="WRONG_ADDRESS">Wrong address</option>
                <option value="ACCESS_ISSUE">Access issue</option>
                <option value="CUSTOMER_REFUSED">Customer refused</option>
                <option value="OTHER">Other</option>
              </select>
            </Field>
            <Button
              variant="danger"
              className="w-full"
              onClick={() => {
                statusMut.mutate({ status: "FAILED", reason, note: reason });
                setFailOpen(false);
              }}
            >
              Confirm failure
            </Button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { StatusBadge } from "../components/StatusBadge";
import { Field, inputClass } from "../components/ui";
import { inr } from "../lib/utils";
import type { AgentProfile, Order, Zone } from "../types";

export function AdminOrdersPage() {
  const [status, setStatus] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [agentId, setAgentId] = useState("");
  const [orderType, setOrderType] = useState("");
  const [paymentType, setPaymentType] = useState("");

  const zones = useQuery({ queryKey: ["zones"], queryFn: async () => (await api.get("/zones")).data.data as Zone[] });
  const agents = useQuery({ queryKey: ["agents"], queryFn: async () => (await api.get("/agents")).data.data as AgentProfile[] });
  const orders = useQuery({
    queryKey: ["admin-orders", status, zoneId, agentId, orderType, paymentType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (zoneId) params.set("zoneId", zoneId);
      if (agentId) params.set("agentId", agentId);
      if (orderType) params.set("orderType", orderType);
      if (paymentType) params.set("paymentType", paymentType);
      return (await api.get(`/orders?${params.toString()}`)).data.data as Order[];
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">All orders</h1>
      <div className="grid gap-3 md:grid-cols-5">
        <Field label="Status">
          <select className={inputClass()} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All</option>
            {["CREATED","ASSIGNED","PICKED_UP","IN_TRANSIT","OUT_FOR_DELIVERY","DELIVERED","FAILED","RESCHEDULED","CANCELLED"].map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Zone">
          <select className={inputClass()} value={zoneId} onChange={(e) => setZoneId(e.target.value)}>
            <option value="">All</option>
            {zones.data?.map((z) => <option key={z.id} value={z.id}>{z.code}</option>)}
          </select>
        </Field>
        <Field label="Agent">
          <select className={inputClass()} value={agentId} onChange={(e) => setAgentId(e.target.value)}>
            <option value="">All</option>
            {agents.data?.map((a) => <option key={a.id} value={a.id}>{a.user?.name}</option>)}
          </select>
        </Field>
        <Field label="Order type">
          <select className={inputClass()} value={orderType} onChange={(e) => setOrderType(e.target.value)}>
            <option value="">All</option>
            <option>B2C</option>
            <option>B2B</option>
          </select>
        </Field>
        <Field label="Payment">
          <select className={inputClass()} value={paymentType} onChange={(e) => setPaymentType(e.target.value)}>
            <option value="">All</option>
            <option>COD</option>
            <option>PREPAID</option>
          </select>
        </Field>
      </div>
      <div className="table-wrap">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Zones</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Charge</th>
              <th className="px-4 py-3">Agent</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {orders.data?.map((order) => (
              <tr key={order.id} className="border-t border-[#efe8dc]">
                <td className="px-4 py-3"><Link className="font-semibold text-[#0f9d8e]" to={`/admin/orders/${order.id}`}>{order.orderNumber}</Link></td>
                <td className="px-4 py-3">{order.customer?.name}</td>
                <td className="px-4 py-3">{order.pickupZone?.code} → {order.dropZone?.code}</td>
                <td className="px-4 py-3">{order.orderType}/{order.paymentType}</td>
                <td className="px-4 py-3">{inr(order.totalCharge)}</td>
                <td className="px-4 py-3">{order.assignedAgent?.user?.name ?? "—"}</td>
                <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                <td className="px-4 py-3">{new Date(order.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {!orders.data?.length ? <tr><td colSpan={8} className="px-4 py-8 text-center text-[#5c6b78]">No matching orders.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import { AgentMap } from "../components/AgentMap";
import { Button, Field, inputClass, Modal } from "../components/ui";
import { formatAge } from "../lib/utils";
import type { AgentProfile, Zone } from "../types";

export function AdminAgentsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["agents"],
    queryFn: async () => (await api.get("/agents")).data.data as AgentProfile[],
    refetchInterval: 15_000,
  });
  const zones = useQuery({ queryKey: ["zones"], queryFn: async () => (await api.get("/zones")).data.data as Zone[] });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", currentZoneId: "", currentLatitude: "", currentLongitude: "" });

  const create = useMutation({
    mutationFn: async () =>
      api.post("/agents", {
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        password: form.password,
        currentZoneId: form.currentZoneId || undefined,
        currentLatitude: form.currentLatitude ? Number(form.currentLatitude) : undefined,
        currentLongitude: form.currentLongitude ? Number(form.currentLongitude) : undefined,
      }),
    onSuccess: () => {
      toast.success("Agent created");
      setOpen(false);
      void qc.invalidateQueries({ queryKey: ["agents"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Delivery agents</h1>
          <p className="text-sm text-muted">Near-real-time agent location updates every 15 seconds.</p>
        </div>
        <Button onClick={() => setOpen(true)}>Add agent</Button>
      </div>
      <div className="stat-card">
        <p className="mb-3 text-sm font-semibold">Latest known positions</p>
        <AgentMap agents={data ?? []} />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {data?.map((agent) => (
          <article key={agent.id} className="stat-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{agent.user?.name}</p>
                <p className="text-sm text-muted">{agent.user?.email}</p>
              </div>
              <span className="text-xs font-semibold uppercase text-muted">{agent.status}</span>
            </div>
            <p className="mt-3 text-sm">
              Availability: {agent.isAvailable ? "AVAILABLE" : "Not available"}
            </p>
            <p className="mt-1 text-sm">
              Location:{" "}
              {agent.locationStatus === "STALE" || agent.locationStatus === "UNAVAILABLE"
                ? "Location unavailable / stale"
                : agent.currentZone?.name ??
                  (agent.currentLatitude != null
                    ? `${agent.currentLatitude.toFixed(4)}, ${agent.currentLongitude?.toFixed(4)}`
                    : "Unknown")}
            </p>
            <p className="mt-1 text-xs text-muted">
              Last updated: {agent.locationUpdatedAt ? formatAge(agent.locationUpdatedAt) : "never"}
            </p>
          </article>
        ))}
      </div>
      <div className="table-wrap">
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Zone</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Active jobs</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((agent) => (
              <tr key={agent.id} className="border-t border-[#efe8dc]">
                <td className="px-4 py-3 font-medium">{agent.user?.name}</td>
                <td className="px-4 py-3">{agent.user?.email}</td>
                <td className="px-4 py-3">{agent.status} {agent.isAvailable ? "· available" : ""}</td>
                <td className="px-4 py-3">{agent.currentZone?.code ?? "—"}</td>
                <td className="px-4 py-3">
                  {agent.locationStatus === "STALE" || agent.locationStatus === "UNAVAILABLE"
                    ? "Stale / unavailable"
                    : `${agent.currentLatitude?.toFixed(4)}, ${agent.currentLongitude?.toFixed(4)}`}
                </td>
                <td className="px-4 py-3">{agent.assignedOrders?.length ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open ? (
        <Modal title="Create agent" onClose={() => setOpen(false)}>
          <div className="space-y-3">
            <Field label="Full name">
              <input className={inputClass()} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Email">
              <input className={inputClass()} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Phone">
              <input className={inputClass()} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="Initial password">
              <input className={inputClass()} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </Field>
            <Field label="Latitude (optional)">
              <input className={inputClass()} value={form.currentLatitude} onChange={(e) => setForm({ ...form, currentLatitude: e.target.value })} />
            </Field>
            <Field label="Longitude (optional)">
              <input className={inputClass()} value={form.currentLongitude} onChange={(e) => setForm({ ...form, currentLongitude: e.target.value })} />
            </Field>
            <Field label="Home zone">
              <select className={inputClass()} value={form.currentZoneId} onChange={(e) => setForm({ ...form, currentZoneId: e.target.value })}>
                <option value="">None</option>
                {zones.data?.map((z) => <option key={z.id} value={z.id}>{z.code}</option>)}
              </select>
            </Field>
            <Button className="w-full" onClick={() => create.mutate()}>Create</Button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

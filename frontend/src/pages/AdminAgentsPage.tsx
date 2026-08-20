import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import { Button, Field, inputClass, Modal } from "../components/ui";
import type { AgentProfile, Zone } from "../types";

export function AdminAgentsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["agents"], queryFn: async () => (await api.get("/agents")).data.data as AgentProfile[] });
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
        <h1 className="text-2xl font-semibold">Delivery agents</h1>
        <Button onClick={() => setOpen(true)}>Add agent</Button>
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
                <td className="px-4 py-3">{agent.currentLatitude?.toFixed(4)}, {agent.currentLongitude?.toFixed(4)}</td>
                <td className="px-4 py-3">{(agent as AgentProfile & { assignedOrders?: unknown[] }).assignedOrders?.length ?? 0}</td>
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

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import { Button, Field, inputClass, Modal } from "../components/ui";
import type { Zone } from "../types";

export function AdminZonesPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["zones"], queryFn: async () => (await api.get("/zones")).data.data as Zone[] });
  const [open, setOpen] = useState(false);
  const [areaZone, setAreaZone] = useState<Zone | null>(null);
  const [form, setForm] = useState({ name: "", code: "", description: "" });
  const [area, setArea] = useState({ pincode: "", areaName: "", city: "Hyderabad" });

  const create = useMutation({
    mutationFn: async () => api.post("/zones", { ...form, code: form.code.toUpperCase() }),
    onSuccess: () => {
      toast.success("Zone created");
      setOpen(false);
      void qc.invalidateQueries({ queryKey: ["zones"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deactivate = useMutation({
    mutationFn: async (id: string) => api.delete(`/zones/${id}`),
    onSuccess: () => {
      toast.success("Zone deactivated");
      void qc.invalidateQueries({ queryKey: ["zones"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const activate = useMutation({
    mutationFn: async (id: string) => api.put(`/zones/${id}`, { active: true }),
    onSuccess: () => {
      toast.success("Zone activated");
      void qc.invalidateQueries({ queryKey: ["zones"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const addArea = useMutation({
    mutationFn: async () => api.post(`/zones/${areaZone!.id}/areas`, area),
    onSuccess: () => {
      toast.success("Pincode mapped");
      setAreaZone(null);
      void qc.invalidateQueries({ queryKey: ["zones"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Zones & pincode maps</h1>
          <p className="text-sm text-muted">Pincode is the authoritative zone input. Map each Hyderabad locality here — the pricing engine reads these rows, not frontend constants.</p>
        </div>
        <Button onClick={() => setOpen(true)}>New zone</Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {data?.map((zone) => (
          <article key={zone.id} className="stat-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-mono text-xs text-accent">{zone.code}</p>
                <h2 className="text-lg font-semibold">{zone.name}</h2>
                <p className="text-sm text-[#5c6b78]">{zone.description}</p>
              </div>
              <span className="text-xs">{zone.active ? "Active" : "Inactive"}</span>
            </div>
            <ul className="mt-3 flex flex-wrap gap-2">
              {zone.areas?.map((item) => (
                <li key={item.id} className="rounded-full bg-[#f4f6f8] px-3 py-1 text-xs">
                  {item.pincode} {item.areaName ? `· ${item.areaName}` : ""}
                </li>
              ))}
            </ul>
            <div className="mt-4 flex gap-2">
              <Button variant="ghost" onClick={() => setAreaZone(zone)}>Map pincode</Button>
              {zone.active ? (
                <Button variant="danger" onClick={() => { if (confirm("Deactivate this zone?")) deactivate.mutate(zone.id); }}>Deactivate</Button>
              ) : (
                <Button variant="ghost" onClick={() => activate.mutate(zone.id)}>Activate</Button>
              )}
            </div>
          </article>
        ))}
      </div>
      {open ? (
        <Modal title="Create zone" onClose={() => setOpen(false)}>
          <div className="space-y-3">
            <Field label="Name"><input className={inputClass()} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Code"><input className={inputClass()} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></Field>
            <Field label="Description"><input className={inputClass()} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
            <Button className="w-full" onClick={() => create.mutate()}>Save</Button>
          </div>
        </Modal>
      ) : null}
      {areaZone ? (
        <Modal title={`Map area to ${areaZone.code}`} onClose={() => setAreaZone(null)}>
          <div className="space-y-3">
            <Field label="Pincode"><input className={inputClass()} value={area.pincode} onChange={(e) => setArea({ ...area, pincode: e.target.value })} required placeholder="500084" /></Field>
            <Field label="Area / locality"><input className={inputClass()} value={area.areaName} onChange={(e) => setArea({ ...area, areaName: e.target.value })} placeholder="Gachibowli" /></Field>
            <Field label="City"><input className={inputClass()} value={area.city} onChange={(e) => setArea({ ...area, city: e.target.value })} /></Field>
            <Button className="w-full" onClick={() => addArea.mutate()}>Add mapping</Button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

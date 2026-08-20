import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import { Button, Field, inputClass, Modal } from "../components/ui";
import { inr } from "../lib/utils";
import type { RateCard, Zone } from "../types";

const blank = {
  name: "",
  orderType: "B2C",
  rateScope: "INTER_ZONE",
  isFallback: false,
  sourceZoneId: "",
  destinationZoneId: "",
  baseRate: "85",
  perKgRate: "12",
  minimumChargeableWeight: "0.5",
  volumetricDivisor: "5000",
  codSurcharge: "50",
  active: true,
};

function cardKind(card: RateCard) {
  return card.isFallback ? "FALLBACK" : "EXACT ROUTE";
}

function routeLabel(card: RateCard) {
  if (card.isFallback) {
    return `${card.orderType} ${card.rateScope === "INTRA_ZONE" ? "INTRA_ZONE" : "INTER_ZONE"}`;
  }
  return `${card.sourceZone?.code ?? "—"} → ${card.destinationZone?.code ?? "—"}`;
}

export function AdminRateCardsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["rate-cards"],
    queryFn: async () => (await api.get("/rate-cards")).data.data as RateCard[],
  });
  const zones = useQuery({ queryKey: ["zones"], queryFn: async () => (await api.get("/zones")).data.data as Zone[] });
  const activeZones = (zones.data ?? []).filter((zone) => zone.active);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<RateCard | null>(null);
  const [form, setForm] = useState(blank);

  const save = useMutation({
    mutationFn: async () => {
      const source = activeZones.find((zone) => zone.id === form.sourceZoneId);
      const dest = activeZones.find((zone) => zone.id === form.destinationZoneId);
      const payload = {
        name:
          form.name.trim() ||
          (form.isFallback
            ? `${form.orderType} ${form.rateScope === "INTRA_ZONE" ? "Intra-zone" : "Inter-zone"} fallback`
            : `${form.orderType} ${source?.code ?? "SRC"} → ${dest?.code ?? "DST"}`),
        orderType: form.orderType,
        rateScope: form.rateScope,
        isFallback: form.isFallback,
        sourceZoneId: form.isFallback ? null : form.sourceZoneId,
        destinationZoneId: form.isFallback
          ? null
          : form.rateScope === "INTRA_ZONE"
            ? form.sourceZoneId
            : form.destinationZoneId,
        baseRate: Number(form.baseRate),
        perKgRate: Number(form.perKgRate),
        minimumChargeableWeight: Number(form.minimumChargeableWeight),
        volumetricDivisor: Number(form.volumetricDivisor),
        codSurcharge: Number(form.codSurcharge),
        active: form.active,
      };
      if (editing) return api.put(`/rate-cards/${editing.id}`, payload);
      return api.post("/rate-cards", payload);
    },
    onSuccess: () => {
      toast.success(editing ? "Rate card updated" : "Rate card saved");
      setOpen(false);
      setEditing(null);
      void qc.invalidateQueries({ queryKey: ["rate-cards"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggle = useMutation({
    mutationFn: async (card: RateCard) => api.put(`/rate-cards/${card.id}`, { active: !card.active }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["rate-cards"] }),
    onError: (error: Error) => toast.error(error.message),
  });

  function openCreate() {
    setEditing(null);
    setForm(blank);
    setOpen(true);
  }

  function openEdit(card: RateCard) {
    setEditing(card);
    setForm({
      name: card.name,
      orderType: card.orderType,
      rateScope: card.rateScope,
      isFallback: Boolean(card.isFallback),
      sourceZoneId: card.sourceZoneId ?? "",
      destinationZoneId: card.destinationZoneId ?? "",
      baseRate: String(card.baseRate),
      perKgRate: String(card.perKgRate),
      minimumChargeableWeight: String(card.minimumChargeableWeight),
      volumetricDivisor: String(card.volumetricDivisor),
      codSurcharge: String(card.codSurcharge),
      active: card.active,
    });
    setOpen(true);
  }

  function patch<K extends keyof typeof blank>(key: K, value: (typeof blank)[K]) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (key === "rateScope" && value === "INTRA_ZONE" && !next.isFallback) {
        next.destinationZoneId = next.sourceZoneId;
      }
      if (key === "sourceZoneId" && next.rateScope === "INTRA_ZONE" && !next.isFallback) {
        next.destinationZoneId = String(value);
      }
      return next;
    });
  }

  const canSave = form.isFallback || (form.sourceZoneId && (form.rateScope === "INTRA_ZONE" || form.destinationZoneId));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Rate cards</h1>
          <p className="text-sm text-[#5c6b78]">
            Exact zone-pair cards are used first. An explicit intra-zone or inter-zone fallback is used only when no exact route exists. There is no hidden default price.
          </p>
        </div>
        <Button onClick={openCreate}>New rate card</Button>
      </div>
      <div className="table-wrap">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead>
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Kind</th>
              <th className="px-4 py-3">Route</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Base / kg</th>
              <th className="px-4 py-3">COD</th>
              <th className="px-4 py-3">Active</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((card) => (
              <tr key={card.id} className="border-t border-[#efe8dc]">
                <td className="px-4 py-3 font-medium">
                  <button className="text-left font-semibold text-[#0f9d8e]" onClick={() => openEdit(card)}>
                    {card.name}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${card.isFallback ? "bg-[#fff4e5] text-[#9a5b00]" : "bg-[#e7f6f4] text-[#0f766e]"}`}>
                    {cardKind(card)}
                  </span>
                </td>
                <td className="px-4 py-3">{routeLabel(card)}</td>
                <td className="px-4 py-3">
                  {card.orderType} {card.rateScope === "INTRA_ZONE" ? "Intra-zone" : "Inter-zone"}
                </td>
                <td className="px-4 py-3">
                  {inr(card.baseRate)} + {inr(card.perKgRate)}/kg
                </td>
                <td className="px-4 py-3">{inr(card.codSurcharge)}</td>
                <td className="px-4 py-3">
                  <button className="text-sm font-semibold text-[#0f9d8e]" onClick={() => toggle.mutate(card)}>
                    {card.active ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open ? (
        <Modal title={editing ? "Edit rate card" : "Create rate card"} onClose={() => setOpen(false)}>
          <div className="space-y-3">
            <Field label="Card kind">
              <select
                className={inputClass()}
                value={form.isFallback ? "FALLBACK" : "EXACT"}
                onChange={(e) => patch("isFallback", e.target.value === "FALLBACK")}
              >
                <option value="EXACT">EXACT ROUTE</option>
                <option value="FALLBACK">FALLBACK</option>
              </select>
            </Field>
            <Field label="Name" hint="Leave blank to auto-name from the route or fallback scope.">
              <input className={inputClass()} value={form.name} onChange={(e) => patch("name", e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Order type">
                <select className={inputClass()} value={form.orderType} onChange={(e) => patch("orderType", e.target.value)}>
                  <option>B2C</option>
                  <option>B2B</option>
                </select>
              </Field>
              <Field label="Scope">
                <select className={inputClass()} value={form.rateScope} onChange={(e) => patch("rateScope", e.target.value)}>
                  <option value="INTRA_ZONE">Intra-zone</option>
                  <option value="INTER_ZONE">Inter-zone</option>
                </select>
              </Field>
            </div>
            {form.isFallback ? (
              <p className="rounded-md bg-[#fff4e5] px-3 py-2 text-sm text-[#9a5b00]">
                This fallback applies to every {form.orderType} {form.rateScope === "INTRA_ZONE" ? "intra-zone" : "inter-zone"} route that has no exact zone-pair card.
              </p>
            ) : (
              <>
                <Field label="Source zone">
                  <select className={inputClass()} value={form.sourceZoneId} onChange={(e) => patch("sourceZoneId", e.target.value)} required>
                    <option value="">Select source zone</option>
                    {activeZones.map((zone) => (
                      <option key={zone.id} value={zone.id}>
                        {zone.code} · {zone.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Destination zone">
                  <select
                    className={inputClass()}
                    value={form.rateScope === "INTRA_ZONE" ? form.sourceZoneId : form.destinationZoneId}
                    onChange={(e) => patch("destinationZoneId", e.target.value)}
                    required
                    disabled={form.rateScope === "INTRA_ZONE"}
                  >
                    <option value="">Select destination zone</option>
                    {activeZones.map((zone) => (
                      <option key={zone.id} value={zone.id}>
                        {zone.code} · {zone.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </>
            )}
            <Field label="Base rate">
              <input className={inputClass()} value={form.baseRate} onChange={(e) => patch("baseRate", e.target.value)} />
            </Field>
            <Field label="Per-kg rate">
              <input className={inputClass()} value={form.perKgRate} onChange={(e) => patch("perKgRate", e.target.value)} />
            </Field>
            <Field label="COD surcharge">
              <input className={inputClass()} value={form.codSurcharge} onChange={(e) => patch("codSurcharge", e.target.value)} />
            </Field>
            <Field label="Minimum chargeable weight">
              <input
                className={inputClass()}
                value={form.minimumChargeableWeight}
                onChange={(e) => patch("minimumChargeableWeight", e.target.value)}
              />
            </Field>
            <Field label="Volumetric divisor">
              <input
                className={inputClass()}
                value={form.volumetricDivisor}
                onChange={(e) => patch("volumetricDivisor", e.target.value)}
              />
            </Field>
            <Button className="w-full" onClick={() => save.mutate()} disabled={!canSave}>
              Save
            </Button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

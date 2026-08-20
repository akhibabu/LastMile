import { useMutation, useQuery } from "@tanstack/react-query";
import { useState, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowRight, Info, MapPin, Package, Wallet } from "lucide-react";
import { api } from "../lib/api";
import { formatApiError } from "../lib/errors";
import { localityName, fetchLocations } from "../lib/locations";
import { LocationSelect } from "../components/LocationSelect";
import { PriceBreakdown } from "../components/PriceBreakdown";
import { EmptyState } from "../components/Tooltip";
import { Button, Field, PageHeader, inputClass } from "../components/ui";
import type { PriceQuote, ServiceLocation } from "../types";

type FormState = {
  pickup: ServiceLocation | null;
  drop: ServiceLocation | null;
  pickupDetails: string;
  dropDetails: string;
  length: string;
  breadth: string;
  height: string;
  actualWeight: string;
  orderType: "B2C" | "B2B";
  paymentType: "COD" | "PREPAID";
  customerId: string;
};

const empty: FormState = {
  pickup: null,
  drop: null,
  pickupDetails: "",
  dropDetails: "",
  length: "",
  breadth: "",
  height: "",
  actualWeight: "",
  orderType: "B2C",
  paymentType: "COD",
  customerId: "",
};

export function CreateOrderPage({ admin = false }: { admin?: boolean }) {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(empty);
  const [quote, setQuote] = useState<PriceQuote | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const customers = useQuery({
    queryKey: ["customers"],
    enabled: admin,
    queryFn: async () => (await api.get("/admin/customers")).data.data as Array<{ id: string; name: string; email: string }>,
  });

  useQuery({
    queryKey: ["locations"],
    queryFn: () => fetchLocations(""),
    staleTime: 30_000,
  });

  const length = Number(form.length);
  const breadth = Number(form.breadth);
  const height = Number(form.height);
  const actualWeight = Number(form.actualWeight);
  const estimatedVolumetric =
    length > 0 && breadth > 0 && height > 0 ? (length * breadth * height) / 5000 : null;
  const largePackage =
    [length, breadth, height].some((value) => value >= 80) ||
    (estimatedVolumetric !== null && estimatedVolumetric >= 50);

  const preview = useMutation({
    mutationFn: async () => {
      const payload = toPayload(form);
      const res = await api.post("/orders/preview-price", payload);
      return res.data.data as PriceQuote;
    },
    onSuccess: (data) => {
      setQuote(data);
      toast.success("Delivery charge calculated from the configured rate card");
    },
    onError: (error: Error) => toast.error(formatApiError(error)),
  });

  const create = useMutation({
    mutationFn: async () => {
      const payload = toPayload(form);
      if (admin && form.customerId) payload.customerId = form.customerId;
      return (await api.post("/orders", payload)).data.data;
    },
    onSuccess: (order: { id: string }) => {
      toast.success("Order confirmed");
      navigate(admin ? `/admin/orders/${order.id}` : `/app/orders/${order.id}`);
    },
    onError: (error: Error) => toast.error(formatApiError(error)),
  });

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setQuote(null);
    setFieldErrors((current) => ({ ...current, [key]: "" }));
    setForm((current) => ({ ...current, [key]: value }));
  }

  function validate() {
    const next: Record<string, string> = {};
    if (!form.pickup) next.pickup = "Select a pickup location";
    else if (!form.pickup.isActive) next.pickup = "We're not delivering to this area yet.";
    if (!form.drop) next.drop = "Select a drop location";
    else if (!form.drop.isActive) next.drop = "We're not delivering to this area yet.";
    if (!form.length || length <= 0) next.length = "Enter package length";
    if (!form.breadth || breadth <= 0) next.breadth = "Enter package breadth";
    if (!form.height || height <= 0) next.height = "Enter package height";
    if (!form.actualWeight || actualWeight <= 0) next.actualWeight = "Enter actual weight";
    if (admin && !form.customerId) next.customerId = "Select a customer";
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  function onPreview(event: FormEvent) {
    event.preventDefault();
    if (!validate() || preview.isPending) return;
    preview.mutate();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px]">
      <form onSubmit={onPreview} className="min-w-0 space-y-6 rounded-[10px] border border-line bg-white p-5 sm:p-6">
        <PageHeader
          kicker={admin ? "Admin" : "New shipment"}
          title={admin ? "Create order for a customer" : "Create delivery"}
          description="Choose a supported locality first. Pincode and zone are filled from the service map — then add the building details."
        />

        {admin ? (
          <Field label="Customer" htmlFor="customerId" error={fieldErrors.customerId}>
            <select
              id="customerId"
              className={inputClass()}
              value={form.customerId}
              onChange={(e) => patch("customerId", e.target.value)}
            >
              <option value="">Select customer</option>
              {customers.data?.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} · {customer.email}
                </option>
              ))}
            </select>
          </Field>
        ) : null}

        <section className="space-y-4 border-t border-line pt-5">
          <SectionTitle icon={<MapPin size={16} />} title="Pickup location" />
          <Field label="Locality" htmlFor="pickup-location">
            <LocationSelect
              id="pickup-location"
              label="Pickup location"
              value={form.pickup}
              onChange={(location) => patch("pickup", location)}
              error={fieldErrors.pickup}
            />
          </Field>
          <Field label="Address details" htmlFor="pickup-details" hint="Building, street, apartment, landmark">
            <input
              id="pickup-details"
              className={inputClass()}
              value={form.pickupDetails}
              onChange={(e) => patch("pickupDetails", e.target.value)}
              placeholder="Building, street, apartment, landmark"
            />
          </Field>
        </section>

        <section className="space-y-4 border-t border-line pt-5">
          <SectionTitle icon={<MapPin size={16} />} title="Drop location" />
          <Field label="Locality" htmlFor="drop-location">
            <LocationSelect
              id="drop-location"
              label="Drop location"
              value={form.drop}
              onChange={(location) => patch("drop", location)}
              error={fieldErrors.drop}
            />
          </Field>
          <Field label="Address details" htmlFor="drop-details" hint="Building, street, apartment, landmark">
            <input
              id="drop-details"
              className={inputClass()}
              value={form.dropDetails}
              onChange={(e) => patch("dropDetails", e.target.value)}
              placeholder="Building, street, apartment, landmark"
            />
          </Field>
        </section>

        <section className="space-y-4 border-t border-line pt-5">
          <SectionTitle icon={<Package size={16} />} title="Package details" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Field label="Length (cm)" htmlFor="length" error={fieldErrors.length}>
              <input id="length" className={inputClass("num")} inputMode="decimal" value={form.length} onChange={(e) => patch("length", e.target.value)} />
            </Field>
            <Field label="Breadth (cm)" htmlFor="breadth" error={fieldErrors.breadth}>
              <input id="breadth" className={inputClass("num")} inputMode="decimal" value={form.breadth} onChange={(e) => patch("breadth", e.target.value)} />
            </Field>
            <Field label="Height (cm)" htmlFor="height" error={fieldErrors.height}>
              <input id="height" className={inputClass("num")} inputMode="decimal" value={form.height} onChange={(e) => patch("height", e.target.value)} />
            </Field>
            <Field label="Actual weight (kg)" htmlFor="weight" error={fieldErrors.actualWeight}>
              <input id="weight" className={inputClass("num")} inputMode="decimal" value={form.actualWeight} onChange={(e) => patch("actualWeight", e.target.value)} />
            </Field>
          </div>
          {estimatedVolumetric !== null && actualWeight > 0 ? (
            <p className="text-xs text-muted">
              Estimated volumetric weight: {estimatedVolumetric.toFixed(3)} kg. Billable weight uses the higher of actual
              and volumetric weight.
            </p>
          ) : null}
          {largePackage ? (
            <p className="rounded-[10px] border border-[#f2d7b5] bg-[#fff8ef] px-3 py-2 text-xs text-[#9a3412]">
              Package dimensions are unusually large. Please verify the measurements. The pricing formula will not be
              capped.
            </p>
          ) : null}
        </section>

        <section className="space-y-4 border-t border-line pt-5">
          <SectionTitle icon={<Wallet size={16} />} title="Order details" />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Order type" htmlFor="orderType">
              <select id="orderType" className={inputClass()} value={form.orderType} onChange={(e) => patch("orderType", e.target.value as FormState["orderType"])}>
                <option value="B2C">B2C</option>
                <option value="B2B">B2B</option>
              </select>
            </Field>
            <Field label="Payment type" htmlFor="paymentType">
              <select id="paymentType" className={inputClass()} value={form.paymentType} onChange={(e) => patch("paymentType", e.target.value as FormState["paymentType"])}>
                <option value="COD">COD</option>
                <option value="PREPAID">Prepaid</option>
              </select>
            </Field>
          </div>
        </section>

        <Button type="submit" className="w-full sm:w-auto" loading={preview.isPending} disabled={Boolean((form.pickup && !form.pickup.isActive) || (form.drop && !form.drop.isActive))}>
          {preview.isPending ? "Calculating..." : "Preview price"}
          {!preview.isPending ? <ArrowRight size={16} /> : null}
        </Button>
      </form>

      <aside className="min-w-0 lg:sticky lg:top-6">
        {quote ? (
          <div className="lm-pop space-y-3">
            <PriceBreakdown quote={quote} />
            <Button className="w-full" loading={create.isPending} onClick={() => create.mutate()}>
              {create.isPending ? "Confirming..." : "Confirm order"}
            </Button>
          </div>
        ) : (
          <EmptyState
            icon={preview.isPending ? <Package className="animate-pulse" /> : <Info size={22} />}
            title={preview.isPending ? "Calculating your delivery charge..." : "Price preview"}
            description="Select supported pickup and drop localities, then preview the live rate card. Gachibowli 500084 → Hitech City 500081 is a good first check."
          />
        )}
      </aside>
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
      <span className="text-accent">{icon}</span>
      {title}
    </h2>
  );
}

function composeAddress(details: string, location: ServiceLocation) {
  const locality = [localityName(location), location.city || "Hyderabad"].join(", ");
  const trimmed = details.trim();
  return trimmed ? `${trimmed}, ${locality}` : locality;
}

function toPayload(form: FormState) {
  if (!form.pickup || !form.drop) {
    throw new Error("Select pickup and drop locations");
  }
  return {
    pickupAddress: composeAddress(form.pickupDetails, form.pickup),
    pickupPincode: form.pickup.pincode,
    dropAddress: composeAddress(form.dropDetails, form.drop),
    dropPincode: form.drop.pincode,
    length: Number(form.length),
    breadth: Number(form.breadth),
    height: Number(form.height),
    actualWeight: Number(form.actualWeight),
    orderType: form.orderType,
    paymentType: form.paymentType,
    customerId: form.customerId || undefined,
  };
}

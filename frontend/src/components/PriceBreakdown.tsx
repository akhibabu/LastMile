import type { PriceQuote } from "../types";
import { inr, kg } from "../lib/utils";
import { ArrowDown } from "lucide-react";
import { Tooltip } from "./Tooltip";

export function PriceBreakdown({ quote }: { quote: PriceQuote }) {
  const pickupPincode = quote.pickup?.pincode;
  const dropPincode = quote.drop?.pincode;
  const rateLabel = `${quote.orderType} • ${quote.zoneScope === "INTRA_ZONE" ? "Intra-zone" : "Inter-zone"}`;

  return (
    <div className="overflow-hidden rounded-[10px] border border-line bg-white">
      <div className="border-b border-line px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Price preview</p>
        <p className="num mt-2 text-[28px] font-semibold tracking-tight text-ink">{inr(quote.totalCharge)}</p>
        <p className="text-sm text-muted">Estimated delivery charge</p>
      </div>

      <div className="border-b border-line px-5 py-4">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Route</p>
        <RoutePoint
          area={quote.pickup?.areaName ?? quote.pickupAddress}
          city={quote.pickup?.city}
          pincode={pickupPincode}
          zone={quote.pickupZone.code}
        />
        <div className="my-2 flex justify-center text-muted">
          <ArrowDown size={16} />
        </div>
        <RoutePoint
          area={quote.drop?.areaName ?? quote.dropAddress}
          city={quote.drop?.city}
          pincode={dropPincode}
          zone={quote.dropZone.code}
        />
      </div>

      <div className="border-b border-line px-5 py-4">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Weight</p>
        <Row label="Actual" value={kg(quote.actualWeight)} />
        <Row
          label="Volumetric"
          value={kg(quote.volumetricWeight)}
          hint="Volumetric weight is calculated using: L × B × H ÷ 5000."
        />
        <Row
          label="Billable"
          value={kg(quote.billableWeight)}
          strong
          hint="Your billable weight is the higher of actual and volumetric weight."
        />
      </div>

      <div className="px-5 py-4">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Rate</p>
        <p className="mb-3 text-sm font-medium text-ink">
          {rateLabel}
          <span className="ml-2 font-normal text-muted">{quote.rateCardName}</span>
        </p>
        <Row label="Base rate" value={inr(quote.baseRate)} />
        <Row label="Weight charge" value={inr(quote.weightCharge)} />
        <Row
          label="COD surcharge"
          value={quote.paymentType === "COD" ? inr(quote.codSurcharge) : "₹0.00 (Prepaid)"}
        />
        <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-sm font-semibold">
          <span>Total</span>
          <span className="num text-accent">{inr(quote.totalCharge)}</span>
        </div>
        <p className="mt-2 text-xs text-muted">Final charge is calculated from the configured rate card.</p>
      </div>
    </div>
  );
}

function RoutePoint({
  area,
  city,
  pincode,
  zone,
}: {
  area?: string | null;
  city?: string | null;
  pincode?: string | null;
  zone: string;
}) {
  return (
    <div>
      <p className="font-semibold text-ink">{area || "—"}</p>
      <p className="num text-sm text-muted">
        {pincode ?? "—"}
        {city ? ` · ${city}` : ""}
        {zone ? ` · ${zone}` : ""}
      </p>
    </div>
  );
}

function Row({
  label,
  value,
  strong = false,
  hint,
}: {
  label: string;
  value: string;
  strong?: boolean;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1 text-sm">
      <span className="inline-flex items-center gap-1.5 text-muted">
        {label}
        {hint ? <Tooltip label={hint} /> : null}
      </span>
      <span className={strong ? "num font-semibold text-ink" : "num font-medium text-ink"}>{value}</span>
    </div>
  );
}

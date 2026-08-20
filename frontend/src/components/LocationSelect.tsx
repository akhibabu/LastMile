import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, Clock3, MapPin, Search } from "lucide-react";
import { fetchLocations, localityName } from "../lib/locations";
import { matchesLocationQuery } from "../lib/locationSearch";
import { cx } from "../lib/utils";
import { CoverageBadge } from "./Tooltip";
import { Spinner, inputClass } from "./ui";
import type { ServiceLocation } from "../types";

export function LocationSelect({
  id,
  label,
  value,
  onChange,
  error,
}: {
  id: string;
  label: string;
  value: ServiceLocation | null;
  onChange: (location: ServiceLocation | null) => void;
  error?: string;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  const locations = useQuery({
    queryKey: ["locations"],
    queryFn: () => fetchLocations(""),
    staleTime: 30_000,
    retry: 1,
  });

  const options = useMemo(
    () =>
      (locations.data ?? []).filter((location) =>
        matchesLocationQuery(debounced, {
          locality: location.locality,
          area: location.area,
          city: location.city,
          pincode: location.pincode,
          zoneName: location.zoneName,
          zoneCode: location.zoneCode,
        }),
      ),
    [locations.data, debounced],
  );
  const showLoading = (locations.isPending || locations.isFetching) && options.length === 0;
  const showError = locations.isError && options.length === 0 && !locations.isFetching;
  const showEmpty = locations.isSuccess && !locations.isFetching && options.length === 0;

  useEffect(() => {
    setActiveIndex(0);
  }, [debounced, open]);

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function select(location: ServiceLocation) {
    onChange(location);
    setQuery("");
    setOpen(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (!open && (event.key === "ArrowDown" || event.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, Math.max(options.length - 1, 0)));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    }
    if (event.key === "Enter" && open && options[activeIndex]) {
      event.preventDefault();
      select(options[activeIndex]);
    }
  }

  const selectedLabel = value ? `${localityName(value)}, ${value.city}` : "";

  return (
    <div ref={rootRef} className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
        <input
          id={id}
          className={inputClass("pl-9 pr-9")}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={open && options[activeIndex] ? `${listId}-${options[activeIndex].id}` : undefined}
          aria-invalid={Boolean(error)}
          aria-label={label}
          placeholder="Search area or locality"
          value={open ? query : selectedLabel || query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            if (value) onChange(null);
          }}
          onFocus={() => {
            setOpen(true);
            if (value) setQuery("");
          }}
          onKeyDown={onKeyDown}
          autoComplete="off"
        />
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
        {open ? (
          <div
            id={listId}
            role="listbox"
            className="lm-pop absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-[10px] border border-line bg-white py-1 shadow-lg"
          >
            {showLoading ? (
              <p className="flex items-center gap-2 px-3 py-3 text-sm text-muted">
                <Spinner /> Searching locations...
              </p>
            ) : null}
            {showError ? (
              <p className="px-3 py-3 text-sm text-[#b42318]" role="alert">
                Unable to load delivery locations. Please try again.
              </p>
            ) : null}
            {showEmpty ? (
              <p className="px-3 py-3 text-sm text-muted">No matching localities. Try another area name.</p>
            ) : null}
            {options.map((location, index) => {
              const selected = value?.id === location.id;
              const active = index === activeIndex;
              const name = localityName(location);
              return (
                <button
                  key={location.id}
                  id={`${listId}-${location.id}`}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  className={cx(
                    "flex w-full items-start gap-3 px-3 py-2.5 text-left transition duration-150",
                    active ? "bg-[#f4f6f8]" : "bg-white",
                    selected ? "bg-[#fff4ec]" : "",
                  )}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => select(location)}
                >
                  <MapPin size={16} className="mt-0.5 shrink-0 text-accent" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-ink">{name}</span>
                      {selected ? <Check size={14} className="text-accent" /> : null}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {location.city} • {location.pincode}
                      {location.zoneCode ? ` · ${location.zoneCode}` : ""}
                    </span>
                  </span>
                  {!location.isActive ? (
                    <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[#9a5b00]">Soon</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="text-xs text-[#b42318]" role="alert">
          {error}
        </p>
      ) : null}

      {value ? (
        <div className="lm-pop rounded-[10px] border border-line bg-[#f8fafc] px-3 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-ink">{localityName(value)}</p>
              <p className="text-sm text-muted">
                {value.city}
                {value.state ? ` • ${value.state}` : ""}
              </p>
            </div>
            <CoverageBadge active={value.isActive} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Pincode</p>
              <p className="num mt-0.5 font-semibold">{value.pincode}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Service status</p>
              <p className={cx("mt-0.5 text-sm font-medium", value.isActive ? "text-[#1d7a36]" : "text-[#9a5b00]")}>
                {value.isActive ? "✓ Service available in your area" : "Coming soon"}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {value && !value.isActive ? (
        <div className="lm-pop rounded-[10px] border border-[#f2d7b5] bg-[#fff8ef] px-3 py-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-[#9a5b00]">
            <Clock3 size={16} /> Coming soon to your area
          </p>
          <p className="mt-1 text-sm text-[#7a5a2b]">
            We're expanding our delivery network and will be available here soon.
          </p>
        </div>
      ) : null}
    </div>
  );
}

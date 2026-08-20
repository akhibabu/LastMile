import { useEffect, useId, useRef } from "react";
import type { AgentProfile } from "../types";

type LeafletMap = {
  fitBounds: (bounds: unknown) => void;
  remove: () => void;
};

type Marker = {
  latitude: number;
  longitude: number;
  label: string;
  kind: "agent" | "pickup";
};

function markersFromAgents(agents: AgentProfile[]): Marker[] {
  const markers: Marker[] = [];
  for (const agent of agents) {
    if (agent.currentLatitude != null && agent.currentLongitude != null) {
      markers.push({
        latitude: agent.currentLatitude,
        longitude: agent.currentLongitude,
        label: `${agent.user?.name ?? "Agent"} (${agent.locationStatus === "STALE" ? "stale" : "latest"})`,
        kind: "agent",
      });
    }
    for (const order of agent.assignedOrders ?? []) {
      if (order.pickupLatitude != null && order.pickupLongitude != null) {
        markers.push({
          latitude: order.pickupLatitude,
          longitude: order.pickupLongitude,
          label: `Pickup ${order.orderNumber}`,
          kind: "pickup",
        });
      }
    }
  }
  return markers;
}

export function AgentMap({ agents }: { agents: AgentProfile[] }) {
  const id = useId().replaceAll(":", "");
  const mapRef = useRef<LeafletMap | null>(null);
  const markers = markersFromAgents(agents);
  const markerKey = markers.map((item) => `${item.kind}:${item.latitude}:${item.longitude}:${item.label}`).join("|");

  useEffect(() => {
    if (markers.length === 0) return;
    let cancelled = false;
    const currentMarkers = markers;

    async function mount() {
      const leaflet = await loadLeaflet();
      if (cancelled) return;
      const el = document.getElementById(`agent-map-${id}`);
      if (!el) return;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const map = leaflet.map(el);
      map.setView([currentMarkers[0].latitude, currentMarkers[0].longitude], 12);
      leaflet
        .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap",
        })
        .addTo(map);

      const bounds = leaflet.latLngBounds([]);
      for (const marker of currentMarkers) {
        const color = marker.kind === "pickup" ? "#e56a1a" : "#0f766e";
        leaflet
          .circleMarker([marker.latitude, marker.longitude], {
            radius: 8,
            color,
            fillColor: color,
            fillOpacity: 0.85,
          })
          .bindPopup(marker.label)
          .addTo(map);
        bounds.extend([marker.latitude, marker.longitude]);
      }
      if (currentMarkers.length > 1) map.fitBounds(bounds.pad(0.2));
      mapRef.current = map;
    }

    void mount();
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [id, markerKey]);

  if (markers.length === 0) {
    return <p className="text-sm text-muted">No recent coordinates to plot yet.</p>;
  }

  return <div id={`agent-map-${id}`} className="h-72 w-full overflow-hidden rounded-[10px] border border-line" />;
}

type LeafletApi = {
  map: (el: HTMLElement) => LeafletMap & { setView: (latlng: [number, number], zoom: number) => void };
  tileLayer: (url: string, options: { attribution: string }) => { addTo: (map: unknown) => void };
  circleMarker: (
    latlng: [number, number],
    options: Record<string, unknown>,
  ) => { bindPopup: (label: string) => { addTo: (map: unknown) => void } };
  latLngBounds: (points: unknown[]) => { extend: (latlng: [number, number]) => void; pad: (n: number) => unknown };
};

async function loadLeaflet(): Promise<LeafletApi> {
  if (!document.getElementById("leaflet-css")) {
    const link = document.createElement("link");
    link.id = "leaflet-css";
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
  }
  const existing = (window as unknown as { L?: LeafletApi }).L;
  if (existing) return existing;
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load map library"));
    document.body.appendChild(script);
  });
  return (window as unknown as { L: LeafletApi }).L;
}

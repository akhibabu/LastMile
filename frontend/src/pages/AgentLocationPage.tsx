import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import { Button, Field, inputClass } from "../components/ui";
import { LocationSharing } from "../components/LocationSharing";
import { formatAge } from "../lib/utils";

export function AgentLocationPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["agent-me"],
    queryFn: async () => (await api.get("/agents/me")).data.data,
    refetchInterval: 15_000,
  });
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  const save = useMutation({
    mutationFn: async () =>
      api.patch("/agents/me/location", {
        latitude: Number(lat || data?.currentLatitude),
        longitude: Number(lng || data?.currentLongitude),
      }),
    onSuccess: () => {
      toast.success("Location stored");
      void qc.invalidateQueries({ queryKey: ["agent-me"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold">Near-real-time location</h1>
      <p className="text-sm text-[#5c6b78]">
        Enable browser sharing on the dashboard for automatic updates. This page is a manual override.
        Last updated: {data?.locationUpdatedAt ? formatAge(data.locationUpdatedAt) : "never"}
        {data?.locationStatus === "STALE" ? " · stale" : ""}
      </p>
      <LocationSharing />
      <Field label="Latitude">
        <input className={inputClass()} value={lat} placeholder={String(data?.currentLatitude ?? "")} onChange={(e) => setLat(e.target.value)} />
      </Field>
      <Field label="Longitude">
        <input className={inputClass()} value={lng} placeholder={String(data?.currentLongitude ?? "")} onChange={(e) => setLng(e.target.value)} />
      </Field>
      <Button onClick={() => save.mutate()} disabled={save.isPending}>Save location</Button>
    </div>
  );
}

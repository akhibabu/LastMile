import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import { Button, Field, inputClass } from "../components/ui";
import { useAuth } from "../lib/auth";

export function AgentLocationPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [lat, setLat] = useState(String(user?.agentProfile?.currentLatitude ?? "26.145"));
  const [lng, setLng] = useState(String(user?.agentProfile?.currentLongitude ?? "91.736"));

  const { data } = useQuery({
    queryKey: ["agent-me"],
    queryFn: async () => (await api.get("/agents/me")).data.data,
  });

  const save = useMutation({
    mutationFn: async () =>
      api.patch(`/agents/${user?.agentProfile?.id ?? "me"}/location`, {
        latitude: Number(lat),
        longitude: Number(lng),
      }),
    onSuccess: () => {
      toast.success("Location stored");
      void qc.invalidateQueries({ queryKey: ["agent-me"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function useBrowserGeo() {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(String(pos.coords.latitude));
        setLng(String(pos.coords.longitude));
        toast.success("Browser location captured");
      },
      () => toast.error("Could not read browser location"),
    );
  }

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold">Update location</h1>
      <p className="text-sm text-[#5c6b78]">
        Auto-assignment uses this last-known point. Streaming GPS is not required.
        Last updated: {data?.locationUpdatedAt ? new Date(data.locationUpdatedAt).toLocaleString() : "never"}
      </p>
      <Field label="Latitude"><input className={inputClass()} value={lat} onChange={(e) => setLat(e.target.value)} /></Field>
      <Field label="Longitude"><input className={inputClass()} value={lng} onChange={(e) => setLng(e.target.value)} /></Field>
      <div className="flex gap-3">
        <Button type="button" variant="ghost" onClick={useBrowserGeo}>Use browser GPS</Button>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>Save location</Button>
      </div>
    </div>
  );
}

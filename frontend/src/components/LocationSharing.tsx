import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { formatAge } from "../lib/utils";
import { Button } from "./ui";

type ShareState = "idle" | "active" | "denied" | "unsupported";

export function LocationSharing() {
  const [state, setState] = useState<ShareState>("idle");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [intervalMs, setIntervalMs] = useState(30_000);
  const watchId = useRef<number | null>(null);
  const lastSent = useRef(0);

  const config = useQuery({
    queryKey: ["public-config"],
    queryFn: async () => (await api.get("/config")).data.data as { locationUpdateIntervalMs: number },
    staleTime: 60_000,
  });

  useEffect(() => {
    if (config.data?.locationUpdateIntervalMs) {
      setIntervalMs(config.data.locationUpdateIntervalMs);
    }
  }, [config.data?.locationUpdateIntervalMs]);

  useEffect(() => {
    return () => {
      if (watchId.current != null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, []);

  function sendPosition(latitude: number, longitude: number) {
    const now = Date.now();
    if (now - lastSent.current < intervalMs) return;
    lastSent.current = now;
    void api
      .patch("/agents/me/location", { latitude, longitude })
      .then(() => setLastUpdate(new Date()))
      .catch(() => undefined);
  }

  function enable() {
    if (!navigator.geolocation) {
      setState("unsupported");
      return;
    }

    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        setState("active");
        sendPosition(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setState("denied");
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: intervalMs,
        timeout: 15_000,
      },
    );
  }

  function disable() {
    if (watchId.current != null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setState("idle");
  }

  return (
    <div className="stat-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Location sharing</p>
          <p className="mt-1 text-sm text-muted">
            {state === "active" ? (
              <>
                <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#1d7a36]" />
                Active
              </>
            ) : (
              <>
                <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[#c5cdd6]" />
                Disabled
              </>
            )}
          </p>
          {state === "active" ? (
            <p className="mt-1 text-xs text-muted">Last update: {lastUpdate ? formatAge(lastUpdate) : "waiting for GPS"}</p>
          ) : null}
          {state === "denied" ? (
            <p className="mt-2 text-sm text-muted">Enable location access to improve delivery assignment.</p>
          ) : null}
          {state === "unsupported" ? (
            <p className="mt-2 text-sm text-muted">This browser does not support geolocation.</p>
          ) : null}
        </div>
        {state === "active" ? (
          <Button variant="ghost" onClick={disable}>
            Stop
          </Button>
        ) : state === "denied" ? null : (
          <Button onClick={enable}>Enable location</Button>
        )}
      </div>
    </div>
  );
}

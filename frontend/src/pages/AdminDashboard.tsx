import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { AgentMap } from "../components/AgentMap";
import { formatAge, inr } from "../lib/utils";
import { Button, PageHeader, Skeleton } from "../components/ui";
import type { AgentProfile } from "../types";

export function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => (await api.get("/admin/dashboard")).data.data,
  });
  const agents = useQuery({
    queryKey: ["agents"],
    queryFn: async () => (await api.get("/agents")).data.data as AgentProfile[],
    refetchInterval: 15_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-56" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  const cards = [
    ["Total orders", data?.totalOrders],
    ["Active deliveries", data?.activeOrders],
    ["Delivered", data?.deliveredOrders],
    ["Failed", data?.failedOrders],
    ["Available agents", data?.availableAgents],
    ["Busy agents", data?.busyAgents],
    ["COD orders", data?.codOrders],
    ["Revenue", inr(data?.revenue ?? 0)],
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Admin"
        title="Operations control"
        description="Live aggregates from PostgreSQL — not calculated in the browser."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={label} className="stat-card">
            <p className="text-sm text-muted">{label}</p>
            <p className="num mt-2 text-3xl font-semibold">{value ?? 0}</p>
          </div>
        ))}
      </div>
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold">Near-real-time agent location</h2>
          <p className="text-sm text-muted">Admin view refreshes automatically. This is periodic browser GPS, not a continuous GPS stream.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {agents.data?.map((agent) => (
            <article key={agent.id} className="stat-card">
              <p className="font-semibold">{agent.user?.name}</p>
              <p className="mt-1 text-sm">Availability: {agent.isAvailable ? "AVAILABLE" : agent.status}</p>
              <p className="mt-1 text-sm">
                Location:{" "}
                {agent.locationStatus === "STALE" || agent.locationStatus === "UNAVAILABLE"
                  ? "Location unavailable / stale"
                  : agent.currentZone?.name ?? "Coordinates only"}
              </p>
              <p className="mt-1 text-xs text-muted">
                Last updated: {agent.locationUpdatedAt ? formatAge(agent.locationUpdatedAt) : "never"}
              </p>
            </article>
          ))}
        </div>
        <div className="stat-card">
          <AgentMap agents={agents.data ?? []} />
        </div>
      </section>
      <div className="flex flex-wrap gap-3">
        <Link to="/admin/orders">
          <Button variant="secondary">View orders</Button>
        </Link>
        <Link to="/admin/orders/new">
          <Button>Create order</Button>
        </Link>
        <Link to="/admin/rate-cards">
          <Button variant="ghost">Rate cards</Button>
        </Link>
      </div>
    </div>
  );
}

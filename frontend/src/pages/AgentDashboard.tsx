import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import { Package } from "lucide-react";
import { Button } from "../components/ui";
import { StatusBadge } from "../components/StatusBadge";
import { EmptyState } from "../components/Tooltip";
import { useAuth } from "../lib/auth";
import type { Order } from "../types";

export function AgentDashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => (await api.get("/admin/dashboard")).data.data,
  });

  const avail = useMutation({
    mutationFn: async (isAvailable: boolean) =>
      api.patch(`/agents/${user?.agentProfile?.id ?? "me"}/availability`, {
        isAvailable,
        status: isAvailable ? "AVAILABLE" : "OFFLINE",
      }),
    onSuccess: () => {
      toast.success("Availability updated");
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
      void qc.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (isLoading) return <p>Loading...</p>;
  const agent = data?.agent;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Agent dashboard</h1>
          <p className="text-[#5c6b78]">Status: {agent?.status} · {agent?.isAvailable ? "Available" : "Not available"}</p>
        </div>
        <Button variant={agent?.isAvailable ? "ghost" : "primary"} onClick={() => avail.mutate(!agent?.isAvailable)}>
          {agent?.isAvailable ? "Go offline" : "Go available"}
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Assigned", data?.assignedOrders],
          ["Active", data?.activeDeliveries],
          ["Completed", data?.completedDeliveries],
          ["Failed", data?.failedDeliveries],
        ].map(([label, value]) => (
          <div key={String(label)} className="stat-card">
            <p className="text-sm text-[#5c6b78]">{label}</p>
            <p className="mt-2 text-3xl font-semibold">{value ?? 0}</p>
          </div>
        ))}
      </div>
      <div className="stat-card">
        <p className="text-sm text-[#5c6b78]">Last known location</p>
        <p className="mt-1 font-medium">
          {agent?.currentLatitude && agent?.currentLongitude
            ? `${agent.currentLatitude.toFixed(5)}, ${agent.currentLongitude.toFixed(5)}`
            : "Not set"}
        </p>
        <p className="text-xs text-[#8a7b66]">Updated {agent?.locationUpdatedAt ? new Date(agent.locationUpdatedAt).toLocaleString() : "never"}</p>
        <Link to="/agent/location" className="mt-3 inline-block text-sm font-semibold text-[#0f9d8e]">Update location</Link>
      </div>
      <section>
        <h2 className="mb-3 text-lg font-semibold">Current assignments</h2>
        <div className="space-y-3">
          {(data?.current as Order[] | undefined)?.map((order) => (
            <Link key={order.id} to={`/agent/orders/${order.id}`} className="stat-card block transition hover:border-accent">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{order.orderNumber}</p>
                <StatusBadge status={order.status} />
              </div>
              <p className="mt-2 text-sm text-[#5c6b78]">{order.pickupAddress} → {order.dropAddress}</p>
            </Link>
          ))}
          {!data?.current?.length ? (
            <EmptyState
              icon={<Package size={22} />}
              title="No active assignments"
              description="When a shipment is assigned to you, it will appear here with pickup and drop details."
            />
          ) : null}
        </div>
      </section>
    </div>
  );
}

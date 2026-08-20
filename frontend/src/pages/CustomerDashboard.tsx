import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Package } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { inr } from "../lib/utils";
import { StatusBadge } from "../components/StatusBadge";
import { EmptyState } from "../components/Tooltip";
import { Button, PageHeader, Skeleton } from "../components/ui";
import type { Order } from "../types";

export function CustomerDashboard() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => (await api.get("/admin/dashboard")).data.data,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-56" />
      </div>
    );
  }

  const cards = [
    ["Total orders", data?.totalOrders],
    ["Active deliveries", data?.activeOrders],
    ["Delivered", data?.deliveredOrders],
    ["Failed", data?.failedOrders],
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Customer"
        title={`Welcome, ${user?.name}`}
        description="Create a shipment, preview the live rate card, then track it through to delivery."
        actions={
          <Link to="/app/orders/new">
            <Button>Create delivery</Button>
          </Link>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={label} className="stat-card">
            <p className="text-sm text-muted">{label}</p>
            <p className="num mt-2 text-3xl font-semibold">{value ?? 0}</p>
          </div>
        ))}
      </div>
      <section>
        <h2 className="mb-3 text-base font-semibold">Recent shipments</h2>
        {!data?.recent?.length ? (
          <EmptyState
            icon={<Package size={22} />}
            title="No delivery history yet"
            description="Your completed and active shipments will appear here."
            action={
              <Link to="/app/orders/new">
                <Button>Create delivery</Button>
              </Link>
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr>
                  <th className="px-4 py-3 font-medium">Order</th>
                  <th className="px-4 py-3 font-medium">Route</th>
                  <th className="px-4 py-3 font-medium">Charge</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {(data.recent as Order[]).map((order) => (
                  <tr key={order.id} className="border-t border-line">
                    <td className="px-4 py-3">
                      <Link className="font-semibold text-accent-2" to={`/app/orders/${order.id}`}>
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {order.pickupZone?.code} → {order.dropZone?.code}
                    </td>
                    <td className="num px-4 py-3">{inr(order.totalCharge)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { inr } from "../lib/utils";
import { Button, PageHeader, Skeleton } from "../components/ui";

export function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => (await api.get("/admin/dashboard")).data.data,
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

import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Package } from "lucide-react";
import { api } from "../lib/api";
import { StatusBadge } from "../components/StatusBadge";
import { EmptyState } from "../components/Tooltip";
import { Button, PageHeader, Skeleton } from "../components/ui";
import { inr } from "../lib/utils";
import type { Order } from "../types";

export function OrdersListPage({ base }: { base: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["orders", base],
    queryFn: async () => (await api.get("/orders")).data.data as Order[],
  });
  const canCreate = base.startsWith("/app");

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Orders"
        description="Scan status, route, and charges across your shipments."
        actions={
          canCreate ? (
            <Link to="/app/orders/new">
              <Button>Create delivery</Button>
            </Link>
          ) : null
        }
      />
      {!data?.length ? (
        <EmptyState
          icon={<Package size={22} />}
          title="No shipments to show"
          description="Your completed and active shipments will appear here."
          action={
            canCreate ? (
              <Link to="/app/orders/new">
                <Button>Create delivery</Button>
              </Link>
            ) : null
          }
        />
      ) : (
        <div className="table-wrap">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Pickup → Drop</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Charge</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map((order) => (
                <tr key={order.id} className="border-t border-line">
                  <td className="px-4 py-3">
                    <Link className="font-semibold text-accent-2" to={`${base}/${order.id}`}>
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {order.pickupZone?.code ?? "?"} → {order.dropZone?.code ?? "?"}
                  </td>
                  <td className="px-4 py-3">
                    {order.orderType} / {order.paymentType}
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
    </div>
  );
}

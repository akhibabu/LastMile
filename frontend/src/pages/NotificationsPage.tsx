import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import { EmptyState } from "../components/Tooltip";
import { Button, PageHeader, Skeleton } from "../components/ui";
import { useAuth } from "../lib/auth";
import type { NotificationItem } from "../types";

export function NotificationsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => (await api.get("/notifications")).data.data as NotificationItem[],
  });

  const retry = useMutation({
    mutationFn: async (id: string) => api.post(`/notifications/${id}/retry`),
    onSuccess: () => {
      toast.success("Retry sent");
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Notifications" description="Shipment events and account messages." />
      {!data?.length ? (
        <EmptyState
          icon={<Bell size={22} />}
          title="No notifications yet"
          description="Assignment, pickup, and delivery updates will show up here."
        />
      ) : (
        <div className="space-y-3">
          {data.map((item) => (
            <article key={item.id} className="stat-card">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">{item.subject ?? item.eventType}</p>
                <span className="text-[11px] font-semibold uppercase text-muted">{item.status}</span>
              </div>
              <p className="mt-1 text-sm text-muted">{item.body}</p>
              <p className="mt-2 text-xs text-muted">
                {item.order?.orderNumber ?? ""} · {new Date(item.createdAt).toLocaleString()} · {item.recipient}
              </p>
              {item.status === "FAILED" && item.errorMessage ? (
                <p className="mt-1 text-xs text-[#b42318]">{item.errorMessage}</p>
              ) : null}
              {user?.role === "ADMIN" && item.status === "FAILED" ? (
                <Button className="mt-3" variant="ghost" onClick={() => retry.mutate(item.id)} disabled={retry.isPending}>
                  Retry email
                </Button>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

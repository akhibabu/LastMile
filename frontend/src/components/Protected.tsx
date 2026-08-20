import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { AppLayout } from "./AppLayout";
import { Skeleton } from "./ui";
import type { Role } from "../types";

export function Protected({ roles }: { roles: Role[] }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="space-y-4 p-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/login" replace />;
  return <AppLayout />;
}

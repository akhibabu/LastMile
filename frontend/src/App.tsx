import { Navigate, Route, Routes } from "react-router-dom";
import { Protected } from "./components/Protected";
import { useAuth } from "./lib/auth";
import { homeForRole } from "./lib/utils";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { CustomerDashboard } from "./pages/CustomerDashboard";
import { CreateOrderPage } from "./pages/CreateOrderPage";
import { OrdersListPage } from "./pages/OrdersListPage";
import { OrderDetailPage } from "./pages/OrderDetailPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { AgentDashboard } from "./pages/AgentDashboard";
import { AgentLocationPage } from "./pages/AgentLocationPage";
import { AdminDashboard } from "./pages/AdminDashboard";
import { AdminOrdersPage } from "./pages/AdminOrdersPage";
import { AdminZonesPage } from "./pages/AdminZonesPage";
import { AdminRateCardsPage } from "./pages/AdminRateCardsPage";
import { AdminAgentsPage } from "./pages/AdminAgentsPage";

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-sm text-muted">Loading session…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={homeForRole(user.role)} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<Protected roles={["CUSTOMER"]} />}>
        <Route path="/app" element={<CustomerDashboard />} />
        <Route path="/app/orders" element={<OrdersListPage base="/app/orders" />} />
        <Route path="/app/orders/new" element={<CreateOrderPage />} />
        <Route path="/app/orders/:id" element={<OrderDetailPage />} />
        <Route path="/app/notifications" element={<NotificationsPage />} />
      </Route>

      <Route element={<Protected roles={["AGENT"]} />}>
        <Route path="/agent" element={<AgentDashboard />} />
        <Route path="/agent/orders" element={<OrdersListPage base="/agent/orders" />} />
        <Route path="/agent/orders/:id" element={<OrderDetailPage />} />
        <Route path="/agent/location" element={<AgentLocationPage />} />
      </Route>

      <Route element={<Protected roles={["ADMIN"]} />}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/orders" element={<AdminOrdersPage />} />
        <Route path="/admin/orders/new" element={<CreateOrderPage admin />} />
        <Route path="/admin/orders/:id" element={<OrderDetailPage />} />
        <Route path="/admin/zones" element={<AdminZonesPage />} />
        <Route path="/admin/rate-cards" element={<AdminRateCardsPage />} />
        <Route path="/admin/agents" element={<AdminAgentsPage />} />
        <Route path="/admin/notifications" element={<NotificationsPage />} />
      </Route>
    </Routes>
  );
}

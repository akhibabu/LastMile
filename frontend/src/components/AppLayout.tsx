import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Bell,
  Bike,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Package,
  Receipt,
  Truck,
  Users,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { cx } from "../lib/utils";

const customerNav = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/orders/new", label: "New delivery", icon: Package },
  { to: "/app/orders", label: "My orders", icon: Truck },
  { to: "/app/notifications", label: "Notifications", icon: Bell },
];

const agentNav = [
  { to: "/agent", label: "Dashboard", icon: LayoutDashboard },
  { to: "/agent/orders", label: "Assignments", icon: Bike },
  { to: "/agent/location", label: "Location", icon: MapPinned },
];

const adminNav = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/orders", label: "Orders", icon: Truck },
  { to: "/admin/orders/new", label: "Create order", icon: Package },
  { to: "/admin/zones", label: "Zones", icon: MapPinned },
  { to: "/admin/rate-cards", label: "Rate cards", icon: Receipt },
  { to: "/admin/agents", label: "Agents", icon: Users },
  { to: "/admin/notifications", label: "Notifications", icon: Bell },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const nav = user?.role === "ADMIN" ? adminNav : user?.role === "AGENT" ? agentNav : customerNav;

  return (
    <div className="min-h-screen bg-page lg:grid lg:grid-cols-[232px_1fr]">
      <aside className="bg-navy text-white lg:min-h-screen">
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-accent text-sm font-bold">LM</div>
          <div>
            <p className="text-sm font-semibold">LastMile</p>
            <p className="text-[11px] text-white/55">Delivery operations</p>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto p-2 lg:block lg:space-y-0.5 lg:overflow-visible lg:p-3">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/app" || item.to === "/admin" || item.to === "/agent"}
              className={({ isActive }) =>
                cx(
                  "flex shrink-0 items-center gap-2.5 rounded-[8px] px-3 py-2 text-sm transition duration-150",
                  isActive ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white",
                )
              }
            >
              <item.icon size={16} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="flex items-center justify-between border-b border-line bg-white px-4 py-3 lg:px-8">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">{user?.role}</p>
            <p className="truncate font-semibold">{user?.name}</p>
          </div>
          <button
            className="inline-flex items-center gap-2 rounded-[10px] border border-line px-3 py-2 text-sm transition hover:bg-[#f8fafc]"
            onClick={() => {
              void logout().then(() => navigate("/login"));
            }}
          >
            <LogOut size={14} /> Logout
          </button>
        </header>
        <main className="p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

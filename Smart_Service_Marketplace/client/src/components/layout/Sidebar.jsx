import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarCheck,
  MessageSquare,
  UserRound,
  Briefcase,
  Users,
  UserCog,
  Wrench,
  Clock3,
  Star,
  Bell,
  Settings,
  Layers,
  CreditCard,
  FileBarChart,
  ChartColumn,
  Settings2,
} from "lucide-react";
import useAuth from "../../hooks/useAuth";
import { ROLES, isAdminRole, isSuperAdmin } from "../../constants/roles";

const customerLinks = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/services", label: "Services", icon: Wrench },
  { to: "/bookings", label: "Bookings", icon: CalendarCheck },
  { to: "/chat", label: "Chat", icon: MessageSquare },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/profile", label: "Profile", icon: UserRound },
];

const technicianLinks = [
  { to: "/technician/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/technician/jobs", label: "Jobs", icon: Briefcase },
  { to: "/chat", label: "Chat", icon: MessageSquare },
  { to: "/technician/availability", label: "Availability", icon: Clock3 },
  { to: "/technician/reviews", label: "Reviews", icon: Star },
  { to: "/technician/notifications", label: "Notifications", icon: Bell },
  { to: "/technician/settings", label: "Settings", icon: Settings },
  { to: "/technician/profile", label: "Profile", icon: UserRound },
];

const adminLinks = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/technicians", label: "Technicians", icon: Wrench },
  { to: "/admin/bookings", label: "Bookings", icon: CalendarCheck },
  { to: "/admin/services", label: "Services", icon: Layers },
  { to: "/admin/payments", label: "Payments", icon: CreditCard },
  { to: "/admin/reviews", label: "Reviews", icon: Star },
  { to: "/admin/analytics", label: "Analytics", icon: ChartColumn },
  { to: "/admin/reports", label: "Reports", icon: FileBarChart },
  { to: "/admin/notifications", label: "Notifications", icon: Bell },
  { to: "/admin/settings", label: "Settings", icon: Settings2 },
  { to: "/admin/profile", label: "Profile", icon: UserRound },
];

const superAdminExtra = [
  { to: "/admin/admins", label: "Admins", icon: UserCog },
];

function Sidebar({ id = "app-sidebar", onNavigate }) {
  const { role } = useAuth();

  let links = customerLinks;
  if (role === ROLES.TECHNICIAN) {
    links = technicianLinks;
  } else if (isAdminRole(role)) {
    links = isSuperAdmin(role)
      ? [...adminLinks, ...superAdminExtra]
      : adminLinks;
  }

  return (
    <aside
      id={id}
      className="flex h-full min-h-screen w-64 flex-col bg-slate-900 text-white"
      aria-label="Main navigation"
    >
      <nav className="flex flex-col gap-1 p-4 sm:p-5" aria-label="Sidebar">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg p-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${
                isActive ? "bg-indigo-600" : "hover:bg-slate-700"
              }`
            }
          >
            <Icon size={20} aria-hidden />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;

import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarCheck,
  MessageSquare,
  UserRound,
  Briefcase,
  Wallet,
  Users,
  UserCog,
  Wrench,
  Clock3,
  Banknote,
  Star,
  Bell,
  Settings,
  ChartColumn,
  Layers,
  CreditCard,
  FileBarChart,
  Settings2,
} from "lucide-react";
import useAuth from "../../hooks/useAuth";
import { ROLES, isAdminRole, isSuperAdmin } from "../../constants/roles";

const customerLinks = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/services", label: "Services", icon: Wrench },
  { to: "/bookings", label: "Bookings", icon: CalendarCheck },
  { to: "/chat", label: "Chat", icon: MessageSquare },
  { to: "/profile", label: "Profile", icon: UserRound },
];

const technicianLinks = [
  { to: "/technician/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/technician/jobs", label: "Jobs", icon: Briefcase },
  { to: "/technician/availability", label: "Availability", icon: Clock3 },
  { to: "/technician/earnings", label: "Earnings", icon: Wallet },
  { to: "/technician/payouts", label: "Payouts", icon: Banknote },
  { to: "/technician/reviews", label: "Reviews", icon: Star },
  { to: "/technician/notifications", label: "Notifications", icon: Bell },
  { to: "/technician/settings", label: "Settings", icon: Settings },
  { to: "/technician/profile", label: "Profile", icon: UserRound },
];

const adminLinks = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/analytics", label: "Analytics", icon: ChartColumn },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/technicians", label: "Technicians", icon: Wrench },
  { to: "/admin/bookings", label: "Bookings", icon: CalendarCheck },
  { to: "/admin/services", label: "Services", icon: Layers },
  { to: "/admin/payments", label: "Payments", icon: CreditCard },
  { to: "/admin/reviews", label: "Reviews", icon: Star },
  { to: "/admin/reports", label: "Reports", icon: FileBarChart },
  { to: "/admin/settings", label: "Settings", icon: Settings2 },
  { to: "/admin/profile", label: "Profile", icon: UserRound },
];

const superAdminExtra = [
  { to: "/admin/admins", label: "Admins", icon: UserCog },
];

function Sidebar() {
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
    <aside className="min-h-screen w-64 bg-slate-900 text-white">
      <nav className="flex flex-col gap-2 p-5">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg p-3 transition ${
                isActive ? "bg-indigo-600" : "hover:bg-slate-700"
              }`
            }
          >
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;

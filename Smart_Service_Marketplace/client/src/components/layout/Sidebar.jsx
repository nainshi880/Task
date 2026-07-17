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
} from "lucide-react";
import useAuth from "../../hooks/useAuth";
import { ROLES, isAdminRole, isSuperAdmin } from "../../constants/roles";

const customerLinks = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/bookings", label: "Bookings", icon: CalendarCheck },
  { to: "/chat", label: "Chat", icon: MessageSquare },
  { to: "/profile", label: "Profile", icon: UserRound },
];

const technicianLinks = [
  { to: "/technician/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/jobs", label: "Jobs", icon: Briefcase },
  { to: "/earnings", label: "Earnings", icon: Wallet },
  { to: "/technician/profile", label: "Profile", icon: UserRound },
];

const adminLinks = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/bookings", label: "Bookings", icon: CalendarCheck },
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

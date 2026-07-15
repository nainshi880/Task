import { NavLink } from "react-router-dom";

import {
  LayoutDashboard,
  CalendarCheck,
  Users,
  UserCog,
  Settings,
} from "lucide-react";

function Sidebar() {
  return (
    <aside className="w-64 min-h-screen bg-slate-900 text-white">

      <nav className="flex flex-col p-5 gap-3">

        <NavLink
          to="/dashboard"
          className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-700"
        >
          <LayoutDashboard size={20} />
          Dashboard
        </NavLink>

        <NavLink
          to="/bookings"
          className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-700"
        >
          <CalendarCheck size={20} />
          Bookings
        </NavLink>

        <NavLink
          to="/technicians"
          className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-700"
        >
          <Users size={20} />
          Technicians
        </NavLink>

        <NavLink
          to="/users"
          className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-700"
        >
          <UserCog size={20} />
          Users
        </NavLink>

        <NavLink
          to="/settings"
          className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-700"
        >
          <Settings size={20} />
          Settings
        </NavLink>

      </nav>

    </aside>
  );
}

export default Sidebar;
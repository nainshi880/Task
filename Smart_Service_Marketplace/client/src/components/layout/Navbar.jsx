import { Bell, LogOut, UserCircle } from "lucide-react";
import useAuth from "../../hooks/useAuth";

function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between bg-white px-6 shadow">
      <h1 className="text-2xl font-bold text-indigo-600">
        Smart Service Marketplace
      </h1>

      <div className="flex items-center gap-5">
        <button type="button" className="relative" aria-label="Notifications">
          <Bell size={22} />
        </button>

        <div className="flex items-center gap-2 text-sm text-slate-700">
          <UserCircle size={28} />
          <span className="hidden sm:inline">{user?.name || "Account"}</span>
        </div>

        <button
          type="button"
          onClick={logout}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </header>
  );
}

export default Navbar;

import { Bell, UserCircle } from "lucide-react";

function Navbar() {
  return (
    <header className="h-16 bg-white shadow flex items-center justify-between px-6 sticky top-0 z-50">

      <h1 className="text-2xl font-bold text-indigo-600">
        Smart Service Marketplace
      </h1>

      <div className="flex items-center gap-5">

        <button className="relative">
          <Bell size={22} />
          <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
            2
          </span>
        </button>

        <UserCircle size={35} />

      </div>

    </header>
  );
}

export default Navbar;
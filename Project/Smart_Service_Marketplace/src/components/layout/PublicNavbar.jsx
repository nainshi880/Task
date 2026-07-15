import { Menu } from "lucide-react";
import { Link } from "react-router-dom";

import Button from "../ui/Button";

function PublicNavbar() {
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">

      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">

        {/* Logo */}

        <Link
          to="/"
          className="text-2xl font-bold text-indigo-600"
        >
          SmartService
        </Link>

        {/* Navigation */}

        <nav className="hidden items-center gap-10 lg:flex">

          <a
            href="#services"
            className="font-medium text-slate-600 hover:text-indigo-600"
          >
            Services
          </a>

          <a
            href="#how-it-works"
            className="font-medium text-slate-600 hover:text-indigo-600"
          >
            How It Works
          </a>

          <a
            href="#features"
            className="font-medium text-slate-600 hover:text-indigo-600"
          >
            Features
          </a>

          <a
            href="#contact"
            className="font-medium text-slate-600 hover:text-indigo-600"
          >
            Contact
          </a>

        </nav>

        {/* Buttons */}

        <div className="hidden items-center gap-4 lg:flex">

          <Link to="/login">
            <Button variant="ghost">
              Login
            </Button>
          </Link>

          <Link to="/register">
            <Button>
              Register
            </Button>
          </Link>

        </div>

        {/* Mobile */}

        <button className="lg:hidden">

          <Menu size={28} />

        </button>

      </div>

    </header>
  );
}

export default PublicNavbar;
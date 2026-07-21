import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Link } from "react-router-dom";

import Button from "../ui/Button";

const NAV_LINKS = [
  { href: "#services", label: "Services" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#features", label: "Features" },
  { href: "#contact", label: "Contact" },
];

function PublicNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return undefined;

    const onKey = (e) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const closeMobile = () => setMobileOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
        <Link
          to="/"
          className="text-2xl font-bold text-indigo-600"
          onClick={closeMobile}
        >
          SmartService
        </Link>

        <nav className="hidden items-center gap-10 lg:flex" aria-label="Main">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="font-medium text-slate-600 hover:text-indigo-600"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-4 lg:flex">
          <Link to="/login">
            <Button variant="ghost">Login</Button>
          </Link>
          <Link to="/register">
            <Button>Register</Button>
          </Link>
        </div>

        <button
          type="button"
          className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 lg:hidden"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? <X size={28} aria-hidden /> : <Menu size={28} aria-hidden />}
        </button>
      </div>

      {mobileOpen && (
        <div className="lg:hidden" id="mobile-nav">
          <button
            type="button"
            className="fixed inset-0 top-20 z-40 bg-black/40"
            aria-label="Close menu overlay"
            onClick={closeMobile}
          />

          <nav
            className="absolute left-0 right-0 z-50 border-b border-slate-200 bg-white px-6 py-5 shadow-lg"
            aria-label="Mobile"
          >
            <div className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={closeMobile}
                  className="rounded-lg px-3 py-3 text-base font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600"
                >
                  {link.label}
                </a>
              ))}
            </div>

            <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4">
              <Link to="/login" onClick={closeMobile}>
                <Button variant="outline" className="w-full">
                  Login
                </Button>
              </Link>
              <Link to="/register" onClick={closeMobile}>
                <Button className="w-full">Register</Button>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

export default PublicNavbar;

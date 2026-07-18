import { Link } from "react-router-dom";
import { FileQuestion } from "lucide-react";

import Button from "../../components/ui/Button";
import useAuth from "../../hooks/useAuth";
import { getRoleHome } from "../../constants/roles";

function NotFoundPage() {
  const { isAuthenticated, role } = useAuth();
  const home = isAuthenticated ? getRoleHome(role) : "/";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-white to-indigo-50 p-6">
      <div className="mx-auto max-w-lg text-center" role="alert">
        <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">
          404
        </p>
        <div className="mx-auto mt-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
          <FileQuestion size={32} aria-hidden />
        </div>
        <h1 className="mt-4 text-3xl font-bold text-slate-900">
          Page not found
        </h1>
        <p className="mt-2 text-slate-500">
          The page you’re looking for doesn’t exist or may have been moved.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to={home}>
            <Button>Go to {isAuthenticated ? "dashboard" : "home"}</Button>
          </Link>
          <Link to="/">
            <Button variant="outline">Marketplace home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default NotFoundPage;

import { Link } from "react-router-dom";
import { ServerCrash } from "lucide-react";

import Button from "../../components/ui/Button";

function ServerErrorPage({ onRetry }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div
        className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm"
        role="alert"
      >
        <p className="text-sm font-semibold uppercase tracking-widest text-rose-600">
          500
        </p>
        <div className="mx-auto mt-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <ServerCrash size={28} aria-hidden />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">
          Server error
        </h1>
        <p className="mt-2 text-slate-500">
          Something went wrong on our side. Please try again shortly.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {onRetry && <Button onClick={onRetry}>Retry</Button>}
          <Link to="/">
            <Button variant="outline">Go home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ServerErrorPage;

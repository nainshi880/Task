import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Search, X } from "lucide-react";

import * as serviceService from "../../services/service.service";
import { serviceKeys } from "../../lib/queryClient";
import { formatCurrency } from "../../utils/format";

function useDebouncedValue(value, delayMs = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

/**
 * Landing / public navbar search against the services catalog API.
 * Clicking a service opens the public service page (no login required).
 */
function ServiceSearchBar({ className = "", onNavigate, compact = false }) {
  const navigate = useNavigate();
  const listId = useId();
  const rootRef = useRef(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const debouncedQuery = useDebouncedValue(query.trim(), 300);

  const searchQuery = useQuery({
    queryKey: serviceKeys.list({ q: debouncedQuery, limit: 6, page: 1 }),
    queryFn: () =>
      serviceService.listServices({
        q: debouncedQuery,
        limit: 6,
        page: 1,
        sortBy: "sortOrder",
        sortOrder: "asc",
      }),
    enabled: debouncedQuery.length >= 2,
    staleTime: 30_000,
  });

  const services =
    searchQuery.data?.services || searchQuery.data?.items || [];

  useEffect(() => {
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const goToServicesSearch = (q) => {
    const trimmed = (q || "").trim();
    const target = trimmed
      ? `/services?q=${encodeURIComponent(trimmed)}`
      : "/services";

    onNavigate?.();
    setOpen(false);
    navigate(target);
  };

  const goToService = (service) => {
    if (!service?._id) return;
    onNavigate?.();
    setOpen(false);
    setQuery(service.name || "");
    navigate(`/services/${service._id}`);
  };

  const onSubmit = (event) => {
    event.preventDefault();
    goToServicesSearch(query);
  };

  const showDropdown = open && debouncedQuery.length >= 2;
  const showEmpty =
    !searchQuery.isFetching &&
    !searchQuery.isError &&
    services.length === 0;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <form onSubmit={onSubmit} role="search" className="relative">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search services..."
          aria-label="Search services"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={showDropdown}
          className={
            compact
              ? "w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-9 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
              : "w-full rounded-full border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-9 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100"
          }
        />
        {query ? (
          <button
            type="button"
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
            onClick={() => {
              setQuery("");
              setOpen(false);
            }}
          >
            <X size={14} />
          </button>
        ) : null}
      </form>

      {showDropdown ? (
        <div
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
        >
          {searchQuery.isFetching ? (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-slate-500">
              <Loader2 size={16} className="animate-spin" />
              Searching services…
            </div>
          ) : null}

          {!searchQuery.isFetching && searchQuery.isError ? (
            <div className="px-4 py-3 text-sm text-rose-600">
              Couldn’t reach the server. Make sure the API is running, then try
              again.
            </div>
          ) : null}

          {showEmpty ? (
            <div className="px-4 py-3 text-sm text-slate-500">
              No services found for “{debouncedQuery}”.
            </div>
          ) : null}

          {services.length > 0 ? (
            <ul className="max-h-80 overflow-y-auto py-1">
              {services.map((service) => (
                <li key={service._id} role="option">
                  <button
                    type="button"
                    className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left hover:bg-indigo-50"
                    onClick={() => goToService(service)}
                  >
                    <span>
                      <span className="block text-xs font-semibold uppercase tracking-wide text-indigo-600">
                        {service.category}
                      </span>
                      <span className="mt-0.5 block text-sm font-medium text-slate-900">
                        {service.name}
                      </span>
                      {(service.shortDescription || service.description) && (
                        <span className="mt-0.5 line-clamp-1 block text-xs text-slate-500">
                          {service.shortDescription || service.description}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-slate-800">
                      {formatCurrency(service.basePrice)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <button
            type="button"
            className="w-full border-t border-slate-100 px-4 py-3 text-left text-sm font-medium text-indigo-600 hover:bg-indigo-50"
            onClick={() => goToServicesSearch(debouncedQuery)}
          >
            View all results for “{debouncedQuery}”
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default ServiceSearchBar;

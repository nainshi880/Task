import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal } from "lucide-react";
import clsx from "clsx";

import DashboardLayout from "../../layouts/DashboardLayout";
import Loader from "../../components/ui/Loader";
import ServiceCard from "../../components/customer/services/ServiceCard";
import * as serviceService from "../../services/service.service";
import { serviceKeys } from "../../lib/queryClient";

const SORT_OPTIONS = [
  { value: "sortOrder:asc", label: "Recommended" },
  { value: "basePrice:asc", label: "Price: Low to High" },
  { value: "basePrice:desc", label: "Price: High to Low" },
  { value: "rating:desc", label: "Highest rated" },
  { value: "name:asc", label: "Name A–Z" },
];

function ServicesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchInput, setSearchInput] = useState(searchParams.get("q") || "");

  const filters = useMemo(
    () => ({
      q: searchParams.get("q") || "",
      category: searchParams.get("category") || "",
      popular: searchParams.get("popular") || "",
      sortBy: searchParams.get("sortBy") || "sortOrder",
      sortOrder: searchParams.get("sortOrder") || "asc",
      page: Number(searchParams.get("page") || 1),
      limit: 12,
    }),
    [searchParams]
  );

  const categoriesQuery = useQuery({
    queryKey: serviceKeys.categories(),
    queryFn: serviceService.getCategories,
  });

  const popularQuery = useQuery({
    queryKey: serviceKeys.popular(),
    queryFn: () => serviceService.getPopularServices({ limit: 6 }),
  });

  const servicesQuery = useQuery({
    queryKey: serviceKeys.list(filters),
    queryFn: () => serviceService.listServices(filters),
  });

  const updateParams = (patch) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([key, value]) => {
      if (value === "" || value === null || value === undefined) {
        next.delete(key);
      } else {
        next.set(key, String(value));
      }
    });
    if (!("page" in patch)) next.set("page", "1");
    setSearchParams(next);
  };

  const categories = categoriesQuery.data?.categories || [];
  const popular = popularQuery.data?.services || [];
  const services = servicesQuery.data?.services || [];
  const pagination = servicesQuery.data?.pagination;

  const sortValue = `${filters.sortBy}:${filters.sortOrder}`;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Browse Services</h1>
          <p className="mt-1 text-slate-500">
            Explore categories, search for services, and book trusted professionals.
          </p>
        </div>

        {/* Search / filter / sort */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
          <form
            className="flex flex-col gap-3 md:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              updateParams({ q: searchInput.trim() });
            }}
          >
            <div className="relative flex-1">
              <Search
                size={18}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search services..."
                className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-4 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
              />
            </div>

            <div className="flex gap-3">
              <div className="relative min-w-[180px]">
                <SlidersHorizontal
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <select
                  value={sortValue}
                  onChange={(event) => {
                    const [sortBy, sortOrder] = event.target.value.split(":");
                    updateParams({ sortBy, sortOrder });
                  }}
                  className="w-full appearance-none rounded-xl border border-slate-300 py-3 pl-9 pr-4 outline-none focus:border-indigo-500"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Search
              </button>
            </div>
          </form>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => updateParams({ category: "", popular: "" })}
              className={clsx(
                "rounded-full px-3 py-1.5 text-sm font-medium",
                !filters.category && !filters.popular
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => updateParams({ popular: "true", category: "" })}
              className={clsx(
                "rounded-full px-3 py-1.5 text-sm font-medium",
                filters.popular === "true"
                  ? "bg-amber-500 text-white"
                  : "bg-amber-50 text-amber-800 hover:bg-amber-100"
              )}
            >
              Popular
            </button>
            {categories.map((category) => (
              <button
                key={category.name}
                type="button"
                onClick={() =>
                  updateParams({ category: category.name, popular: "" })
                }
                className={clsx(
                  "rounded-full px-3 py-1.5 text-sm font-medium",
                  filters.category === category.name
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {category.name}
                {category.serviceCount > 0 && (
                  <span className="ml-1 opacity-70">({category.serviceCount})</span>
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Categories overview */}
        {!filters.q && !filters.category && filters.popular !== "true" && (
          <section>
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              Service categories
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {categories.map((category) => (
                <button
                  key={category.name}
                  type="button"
                  onClick={() => updateParams({ category: category.name })}
                  className="rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-indigo-200 hover:shadow-md"
                >
                  <p className="font-semibold text-slate-900">{category.name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {category.serviceCount} service
                    {category.serviceCount === 1 ? "" : "s"}
                  </p>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Popular */}
        {!filters.q && !filters.category && filters.popular !== "true" && popular.length > 0 && (
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Popular services
              </h2>
              <button
                type="button"
                onClick={() => updateParams({ popular: "true" })}
                className="text-sm font-medium text-indigo-600 hover:underline"
              >
                View all popular
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {popular.map((service) => (
                <ServiceCard key={service._id} service={service} />
              ))}
            </div>
          </section>
        )}

        {/* Results */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              {filters.category
                ? `${filters.category} services`
                : filters.popular === "true"
                  ? "Popular services"
                  : filters.q
                    ? `Results for “${filters.q}”`
                    : "All services"}
            </h2>
            {pagination && (
              <p className="text-sm text-slate-500">
                {pagination.total} result{pagination.total === 1 ? "" : "s"}
              </p>
            )}
          </div>

          {servicesQuery.isLoading ? (
            <Loader text="Loading services..." />
          ) : services.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
              <p className="text-slate-500">No services match your filters.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setSearchParams({});
                }}
                className="mt-3 text-sm font-medium text-indigo-600 hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {services.map((service) => (
                  <ServiceCard key={service._id} service={service} />
                ))}
              </div>

              {pagination && pagination.totalPages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    disabled={filters.page <= 1}
                    onClick={() => updateParams({ page: filters.page - 1 })}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-slate-600">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={filters.page >= pagination.totalPages}
                    onClick={() => updateParams({ page: filters.page + 1 })}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}

export default ServicesPage;

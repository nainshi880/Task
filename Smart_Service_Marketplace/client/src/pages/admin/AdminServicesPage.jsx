import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Layers, Pencil, Plus, Tag, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import clsx from "clsx";

import DashboardLayout from "../../layouts/DashboardLayout";
import Loader from "../../components/ui/Loader";
import Button from "../../components/ui/Button";
import * as adminService from "../../services/admin.service";
import { adminKeys } from "../../lib/queryClient";
import { formatCurrency } from "../../utils/format";

const TABS = {
  catalog: "catalog",
  categories: "categories",
};

const EMPTY_CATEGORY_FORM = {
  name: "",
  description: "",
  iconUrl: "",
  commissionPercent: "",
  gstRate: "",
  sortOrder: "",
  isActive: true,
};

function AdminServicesPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState(TABS.catalog);

  const [includeInactive, setIncludeInactive] = useState(true);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_CATEGORY_FORM);

  const [catalogSearch, setCatalogSearch] = useState("");
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [priceDraft, setPriceDraft] = useState("");

  const listParams = useMemo(
    () => ({
      includeInactive: includeInactive ? "true" : undefined,
      q: search.trim() || undefined,
    }),
    [includeInactive, search]
  );

  const catalogParams = useMemo(
    () => ({
      includeInactive: "true",
      q: catalogSearch.trim() || undefined,
      limit: 100,
    }),
    [catalogSearch]
  );

  const categoriesQuery = useQuery({
    queryKey: adminKeys.categories(listParams),
    queryFn: () => adminService.listServiceCategories(listParams),
    retry: false,
    enabled: tab === TABS.categories,
  });

  const catalogQuery = useQuery({
    queryKey: adminKeys.catalogServices(catalogParams),
    queryFn: () => adminService.listCatalogServices(catalogParams),
    retry: false,
    enabled: tab === TABS.catalog,
  });

  const categories = useMemo(() => {
    const data = categoriesQuery.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.categories)) return data.categories;
    if (Array.isArray(data?.items)) return data.items;
    return [];
  }, [categoriesQuery.data]);

  const catalogServices = useMemo(() => {
    const data = catalogQuery.data;
    if (Array.isArray(data?.services)) return data.services;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data)) return data;
    return [];
  }, [catalogQuery.data]);

  const invalidateCategories = () =>
    queryClient.invalidateQueries({
      queryKey: [...adminKeys.all, "categories"],
    });

  const invalidateCatalog = () =>
    queryClient.invalidateQueries({
      queryKey: [...adminKeys.all, "catalog-services"],
    });

  const createMutation = useMutation({
    mutationFn: (payload) => adminService.createServiceCategory(payload),
    onSuccess: () => {
      toast.success("Category created");
      setForm(EMPTY_CATEGORY_FORM);
      setShowForm(false);
      invalidateCategories();
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Create failed"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) =>
      adminService.updateServiceCategory(id, payload),
    onSuccess: () => {
      toast.success("Category updated");
      setEditingId(null);
      setShowForm(false);
      setForm(EMPTY_CATEGORY_FORM);
      invalidateCategories();
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Update failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminService.deleteServiceCategory(id),
    onSuccess: () => {
      toast.success("Category deactivated");
      invalidateCategories();
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Delete failed"),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }) =>
      adminService.updateServiceCategory(id, { isActive }),
    onSuccess: (_, vars) => {
      toast.success(vars.isActive ? "Category enabled" : "Category disabled");
      invalidateCategories();
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Status update failed"),
  });

  const updatePriceMutation = useMutation({
    mutationFn: ({ id, basePrice }) =>
      adminService.updateCatalogService(id, { basePrice }),
    onSuccess: () => {
      toast.success("Price updated");
      setEditingServiceId(null);
      setPriceDraft("");
      invalidateCatalog();
      queryClient.invalidateQueries({ queryKey: ["services"] });
    },
    onError: (err) =>
      toast.error(err.response?.data?.message || "Could not update price"),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_CATEGORY_FORM);
    setShowForm(true);
  };

  const openEdit = (cat) => {
    setEditingId(cat._id);
    setForm({
      name: cat.name || "",
      description: cat.description || "",
      iconUrl: cat.iconUrl || "",
      commissionPercent:
        cat.commissionPercent != null ? String(cat.commissionPercent) : "",
      gstRate: cat.gstRate != null ? String(cat.gstRate) : "",
      sortOrder: cat.sortOrder != null ? String(cat.sortOrder) : "",
      isActive: cat.isActive !== false,
    });
    setShowForm(true);
  };

  const buildPayload = () => {
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      iconUrl: form.iconUrl.trim() || undefined,
      isActive: form.isActive,
    };
    if (form.commissionPercent !== "") {
      payload.commissionPercent = Number(form.commissionPercent);
    }
    if (form.gstRate !== "") payload.gstRate = Number(form.gstRate);
    if (form.sortOrder !== "") payload.sortOrder = Number(form.sortOrder);
    return payload;
  };

  const submitForm = (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    const payload = buildPayload();
    if (editingId) {
      updateMutation.mutate({ id: editingId, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const startEditPrice = (service) => {
    setEditingServiceId(service._id);
    setPriceDraft(String(service.basePrice ?? ""));
  };

  const savePrice = (serviceId) => {
    const value = Number(priceDraft);
    if (Number.isNaN(value) || value < 0) {
      toast.error("Enter a valid price (0 or more)");
      return;
    }
    updatePriceMutation.mutate({ id: serviceId, basePrice: value });
  };

  const busy =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    toggleMutation.isPending ||
    updatePriceMutation.isPending;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Services</h1>
            <p className="mt-1 text-slate-500">
              Edit catalog prices and manage service categories.
            </p>
          </div>
          {tab === TABS.categories && (
            <Button size="sm" onClick={openCreate}>
              <Plus size={16} />
              Add category
            </Button>
          )}
        </div>

        <div className="flex gap-2 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
          <button
            type="button"
            onClick={() => setTab(TABS.catalog)}
            className={clsx(
              "flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
              tab === TABS.catalog
                ? "bg-indigo-600 text-white"
                : "text-slate-600 hover:bg-slate-50"
            )}
          >
            <Tag size={16} />
            Catalog &amp; prices
          </button>
          <button
            type="button"
            onClick={() => setTab(TABS.categories)}
            className={clsx(
              "flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
              tab === TABS.categories
                ? "bg-indigo-600 text-white"
                : "text-slate-600 hover:bg-slate-50"
            )}
          >
            <Layers size={16} />
            Categories
          </button>
        </div>

        {tab === TABS.catalog && (
          <>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <input
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder="Search services…"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
              />
            </div>

            {catalogQuery.isLoading ? (
              <Loader text="Loading catalog services..." />
            ) : catalogQuery.isError ? (
              <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
                <p className="font-medium text-red-800">
                  Could not load catalog services
                </p>
                <p className="mt-1 text-sm text-red-600">
                  {catalogQuery.error?.response?.data?.message ||
                    catalogQuery.error?.message}
                </p>
                <Button
                  className="mt-4"
                  variant="outline"
                  onClick={() => catalogQuery.refetch()}
                >
                  Retry
                </Button>
              </div>
            ) : catalogServices.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
                <Tag className="mx-auto text-slate-300" size={36} />
                <h2 className="mt-3 text-lg font-semibold text-slate-900">
                  No services found
                </h2>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="divide-y divide-slate-100">
                  {catalogServices.map((service) => {
                    const editing = editingServiceId === service._id;
                    return (
                      <div
                        key={service._id}
                        className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-slate-900">
                              {service.name}
                            </p>
                            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                              {service.category}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-slate-500">
                            {service.shortDescription || "No description"}
                          </p>
                          {!editing && (
                            <p className="mt-1 text-sm font-semibold text-slate-800">
                              {formatCurrency(service.basePrice || 0)}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {editing ? (
                            <>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={priceDraft}
                                onChange={(e) => setPriceDraft(e.target.value)}
                                className="w-28 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
                                autoFocus
                              />
                              <Button
                                size="sm"
                                loading={updatePriceMutation.isPending}
                                onClick={() => savePrice(service._id)}
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingServiceId(null);
                                  setPriceDraft("");
                                }}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={() => startEditPrice(service)}
                            >
                              <Pencil size={14} />
                              Edit price
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {tab === TABS.categories && (
          <>
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search categories…"
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
              />
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={includeInactive}
                  onChange={(e) => setIncludeInactive(e.target.checked)}
                  className="rounded border-slate-300"
                />
                Show inactive
              </label>
            </div>

            {showForm && (
              <form
                onSubmit={submitForm}
                className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5 shadow-sm"
              >
                <h2 className="text-lg font-semibold text-slate-900">
                  {editingId ? "Edit category" : "New category"}
                </h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <input
                    required
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    placeholder="Name *"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                  />
                  <input
                    value={form.iconUrl}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, iconUrl: e.target.value }))
                    }
                    placeholder="Icon URL"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={form.commissionPercent}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        commissionPercent: e.target.value,
                      }))
                    }
                    placeholder="Commission %"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                  />
                  <input
                    type="number"
                    min="0"
                    max="40"
                    value={form.gstRate}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, gstRate: e.target.value }))
                    }
                    placeholder="GST %"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                  />
                  <input
                    type="number"
                    min="0"
                    value={form.sortOrder}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, sortOrder: e.target.value }))
                    }
                    placeholder="Sort order"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
                  />
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, isActive: e.target.checked }))
                      }
                    />
                    Active
                  </label>
                </div>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  rows={2}
                  placeholder="Description"
                  className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
                />
                <div className="mt-4 flex gap-2">
                  <Button type="submit" size="sm" loading={busy}>
                    {editingId ? "Save changes" : "Create"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      setEditingId(null);
                      setForm(EMPTY_CATEGORY_FORM);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}

            {categoriesQuery.isLoading ? (
              <Loader text="Loading categories..." />
            ) : categoriesQuery.isError ? (
              <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center">
                <p className="font-medium text-red-800">
                  Could not load categories
                </p>
                <p className="mt-1 text-sm text-red-600">
                  {categoriesQuery.error?.response?.data?.message ||
                    categoriesQuery.error?.message}
                </p>
                <Button
                  className="mt-4"
                  variant="outline"
                  onClick={() => categoriesQuery.refetch()}
                >
                  Retry
                </Button>
              </div>
            ) : categories.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
                <Layers className="mx-auto text-slate-300" size={36} />
                <h2 className="mt-3 text-lg font-semibold text-slate-900">
                  No categories yet
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Add your first service category to get started.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="divide-y divide-slate-100">
                  {categories.map((cat) => (
                    <div
                      key={cat._id}
                      className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-900">
                            {cat.name}
                          </p>
                          <span
                            className={clsx(
                              "rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase",
                              cat.isActive
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-600"
                            )}
                          >
                            {cat.isActive ? "Active" : "Disabled"}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">
                          {cat.description || "No description"}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Commission {cat.commissionPercent ?? 0}% · GST{" "}
                          {cat.gstRate ?? 0}%
                          {cat.sortOrder != null
                            ? ` · Order ${cat.sortOrder}`
                            : ""}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => openEdit(cat)}
                        >
                          <Pencil size={14} />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant={cat.isActive ? "secondary" : "success"}
                          disabled={busy}
                          onClick={() =>
                            toggleMutation.mutate({
                              id: cat._id,
                              isActive: !cat.isActive,
                            })
                          }
                        >
                          {cat.isActive ? "Disable" : "Enable"}
                        </Button>
                        {cat.isActive && (
                          <Button
                            size="sm"
                            variant="danger"
                            disabled={busy}
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Deactivate “${cat.name}”? It can be re-enabled later.`
                                )
                              ) {
                                deleteMutation.mutate(cat._id);
                              }
                            }}
                          >
                            <Trash2 size={14} />
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

export default AdminServicesPage;

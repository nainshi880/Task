import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import DashboardLayout from "../../layouts/DashboardLayout";
import Loader from "../../components/ui/Loader";
import AddressManager from "../../components/customer/profile/AddressManager";
import * as customerService from "../../services/customer.service";
import { customerKeys } from "../../lib/queryClient";

function AddressesPage() {
  const profileQuery = useQuery({
    queryKey: customerKeys.profile(),
    queryFn: customerService.getProfile,
    retry: false,
  });

  if (profileQuery.isLoading) {
    return (
      <DashboardLayout>
        <Loader text="Loading addresses..." />
      </DashboardLayout>
    );
  }

  if (profileQuery.isError) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Profile required</h1>
          <p className="mt-2 text-slate-500">
            Complete your profile before managing addresses.
          </p>
          <Link
            to="/setup/customer"
            className="mt-6 inline-flex rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Finish setup
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const addresses = profileQuery.data?.addresses || [];

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <Link
            to="/profile"
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:underline"
          >
            <ArrowLeft size={16} />
            Back to profile
          </Link>
          <h1 className="text-3xl font-bold text-slate-900">My Addresses</h1>
          <p className="mt-1 text-slate-500">
            Add, edit, delete, and set your default service address.
          </p>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <AddressManager addresses={addresses} />
        </section>
      </div>
    </DashboardLayout>
  );
}

export default AddressesPage;

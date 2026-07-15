import {
  ShieldCheck,
  Clock3,
  BadgeCheck,
} from "lucide-react";

function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="min-h-screen bg-slate-100">

      <div className="grid min-h-screen lg:grid-cols-2">

        {/* Left Section */}

        <div className="hidden lg:flex bg-gradient-to-br from-indigo-700 via-blue-600 to-cyan-500 text-white p-16 flex-col justify-between">

          <div>

            <h1 className="text-5xl font-bold leading-tight">

              Smart Service

              <br />

              Marketplace

            </h1>

            <p className="mt-8 text-lg text-indigo-100">

              Book trusted home services with verified
              professionals in just a few clicks.

            </p>

          </div>

          <div className="space-y-8">

            <div className="flex items-center gap-4">

              <ShieldCheck size={40} />

              <div>

                <h3 className="text-xl font-semibold">
                  Verified Experts
                </h3>

                <p className="text-indigo-100">
                  Background verified technicians.
                </p>

              </div>

            </div>

            <div className="flex items-center gap-4">

              <Clock3 size={40} />

              <div>

                <h3 className="text-xl font-semibold">
                  Fast Booking
                </h3>

                <p className="text-indigo-100">
                  Book services in under two minutes.
                </p>

              </div>

            </div>

            <div className="flex items-center gap-4">

              <BadgeCheck size={40} />

              <div>

                <h3 className="text-xl font-semibold">
                  Quality Guaranteed
                </h3>

                <p className="text-indigo-100">
                  Trusted by thousands of customers.
                </p>

              </div>

            </div>

          </div>

        </div>

        {/* Right Section */}

        <div className="flex items-center justify-center px-6 py-10">

          <div className="w-full max-w-md">

            <div className="mb-10 text-center">

              <h2 className="text-4xl font-bold">

                {title}

              </h2>

              <p className="mt-3 text-slate-500">

                {subtitle}

              </p>

            </div>

            {children}

          </div>

        </div>

      </div>

    </div>
  );
}

export default AuthLayout;
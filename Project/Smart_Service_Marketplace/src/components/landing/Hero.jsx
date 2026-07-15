import { ArrowRight, CheckCircle } from "lucide-react";

import Button from "../ui/Button";

function Hero() {
  return (
    <section className="mx-auto flex min-h-[90vh] max-w-7xl flex-col items-center justify-between gap-16 px-6 py-20 lg:flex-row">

      {/* Left */}

      <div className="max-w-2xl">

        <span className="rounded-full bg-indigo-100 px-5 py-2 text-sm font-semibold text-indigo-700">

          Trusted by 10,000+ Customers

        </span>

        <h1 className="mt-8 text-5xl font-extrabold leading-tight text-slate-900 lg:text-7xl">

          Book Trusted

          <span className="block text-indigo-600">

            Home Services

          </span>

          Within Minutes

        </h1>

        <p className="mt-8 text-lg leading-8 text-slate-600">

          Connect with verified technicians for plumbing,
          electrical work, AC repair, painting,
          cleaning and more.

          Fast, secure and hassle-free.

        </p>

        {/* Buttons */}

        <div className="mt-10 flex flex-wrap gap-5">

          <Button size="lg">

            Book Service

            <ArrowRight className="ml-2 inline" size={18} />

          </Button>

          <Button
            variant="outline"
            size="lg"
          >
            Become Technician
          </Button>

        </div>

        {/* Trust Points */}

        <div className="mt-12 grid gap-4 sm:grid-cols-2">

          <div className="flex items-center gap-3">

            <CheckCircle className="text-emerald-500" />

            <span>Verified Professionals</span>

          </div>

          <div className="flex items-center gap-3">

            <CheckCircle className="text-emerald-500" />

            <span>24/7 Support</span>

          </div>

          <div className="flex items-center gap-3">

            <CheckCircle className="text-emerald-500" />

            <span>Real-Time Tracking</span>

          </div>

          <div className="flex items-center gap-3">

            <CheckCircle className="text-emerald-500" />

            <span>Secure Payments</span>

          </div>

        </div>

      </div>

      {/* Right */}

      <div className="flex flex-1 justify-center">

        <div className="relative flex h-[520px] w-[520px] items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 via-blue-500 to-cyan-400 shadow-2xl">

          <div className="h-[420px] w-[420px] rounded-full bg-white shadow-xl flex items-center justify-center">

            <img
              src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800"
              alt="Home Services"
              className="h-[360px] w-[360px] rounded-full object-cover"
            />

          </div>

        </div>

      </div>

    </section>
  );
}

export default Hero;
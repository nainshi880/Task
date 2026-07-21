import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle } from "lucide-react";

import Button from "../ui/Button";

function Hero() {
  return (
    <section className="mx-auto flex min-h-[90vh] w-full max-w-7xl flex-col items-center justify-between gap-12 overflow-x-hidden px-6 py-16 lg:flex-row lg:gap-16 lg:py-20">
      <div className="w-full min-w-0 max-w-2xl">
        <span className="inline-block rounded-full bg-indigo-100 px-5 py-2 text-sm font-semibold text-indigo-700">
          Trusted by 10,000+ Customers
        </span>

        <h1 className="mt-8 text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl lg:text-7xl">
          Book Trusted
          <span className="block text-indigo-600">Home Services</span>
          Within Minutes
        </h1>

        <p className="mt-6 text-base leading-8 text-slate-600 sm:mt-8 sm:text-lg">
          Connect with verified technicians for plumbing, electrical work, AC
          repair, painting, cleaning and more. Fast, secure and hassle-free.
        </p>

        <div className="mt-8 flex flex-wrap gap-4 sm:mt-10 sm:gap-5">
          <Link to="/services">
            <Button size="lg">
              Book Service
              <ArrowRight className="ml-2 inline" size={18} aria-hidden />
            </Button>
          </Link>
          <Link to="/register">
            <Button variant="outline" size="lg">
              Become Technician
            </Button>
          </Link>
        </div>

        <div className="mt-10 grid gap-4 sm:mt-12 sm:grid-cols-2">
          {[
            "Verified Professionals",
            "24/7 Support",
            "Real-Time Tracking",
            "Secure Payments",
          ].map((label) => (
            <div key={label} className="flex items-center gap-3">
              <CheckCircle className="shrink-0 text-emerald-500" aria-hidden />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex w-full min-w-0 flex-1 justify-center">
        <div className="relative mx-auto aspect-square w-full max-w-[min(100%,520px)]">
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 via-blue-500 to-cyan-400 shadow-2xl">
            <div className="flex h-[80%] w-[80%] items-center justify-center rounded-full bg-white shadow-xl">
              <img
                src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800"
                alt="Home services professional"
                className="h-[85%] w-[85%] rounded-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;

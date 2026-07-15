import {
  Zap,
  Wrench,
  Paintbrush,
  AirVent,
  Hammer,
  BrushCleaning,
  ArrowRight,
} from "lucide-react";

const services = [
  {
    icon: Zap,
    title: "Electrical",
    description:
      "Installation, wiring, switchboard and electrical maintenance.",
  },
  {
    icon: Wrench,
    title: "Plumbing",
    description:
      "Leak repairs, fittings, bathroom and kitchen plumbing solutions.",
  },
  {
    icon: BrushCleaning,
    title: "Cleaning",
    description:
      "Professional home, office and deep cleaning services.",
  },
  {
    icon: Paintbrush,
    title: "Painting",
    description:
      "Interior and exterior painting by verified professionals.",
  },
  {
    icon: AirVent,
    title: "AC Repair",
    description:
      "AC installation, servicing and maintenance.",
  },
  {
    icon: Hammer,
    title: "Carpentry",
    description:
      "Furniture assembly, repairs and woodwork services.",
  },
];

function Services() {
  return (
    <section
      id="services"
      className="bg-white py-24"
    >
      <div className="max-w-7xl mx-auto px-6">

        <div className="text-center">

          <h2 className="text-4xl font-bold text-slate-900">
            Popular Services
          </h2>

          <p className="mt-4 text-slate-600 max-w-2xl mx-auto">
            Choose from a wide range of trusted home services
            performed by verified professionals.
          </p>

        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">

          {services.map((service) => {

            const Icon = service.icon;

            return (
              <div
                key={service.title}
                className="group rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:border-indigo-500 hover:shadow-xl"
              >

                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-indigo-100">

                  <Icon
                    size={32}
                    className="text-indigo-600"
                  />

                </div>

                <h3 className="mt-6 text-2xl font-semibold">

                  {service.title}

                </h3>

                <p className="mt-4 text-slate-600">

                  {service.description}

                </p>

                <button className="mt-6 flex items-center gap-2 font-medium text-indigo-600">

                  Explore

                  <ArrowRight
                    size={18}
                    className="transition-transform group-hover:translate-x-1"
                  />

                </button>

              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default Services;
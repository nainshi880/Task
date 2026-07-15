import {
  ShieldCheck,
  Clock3,
  MapPinned,
  Wallet,
  BadgeCheck,
  Headphones,
} from "lucide-react";

const features = [
  {
    icon: ShieldCheck,
    title: "Verified Professionals",
    description:
      "Every technician is background verified and professionally trained.",
  },
  {
    icon: Clock3,
    title: "Quick Booking",
    description:
      "Book any service in less than two minutes with instant confirmation.",
  },
  {
    icon: MapPinned,
    title: "Nearby Technicians",
    description:
      "Automatically connects you with professionals near your location.",
  },
  {
    icon: Wallet,
    title: "Secure Payments",
    description:
      "Multiple payment methods with encrypted and secure transactions.",
  },
  {
    icon: BadgeCheck,
    title: "Quality Guarantee",
    description:
      "Every completed service is quality checked for customer satisfaction.",
  },
  {
    icon: Headphones,
    title: "24/7 Support",
    description:
      "Dedicated customer support whenever you need assistance.",
  },
];

function Features() {
  return (
    <section id="features" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">

        <div className="text-center">

          <h2 className="text-4xl font-bold">
            Why Choose Us?
          </h2>

          <p className="mt-4 text-slate-600">
            We make home services faster, safer and more reliable.
          </p>

        </div>

        <div className="grid gap-8 mt-16 md:grid-cols-2 lg:grid-cols-3">

          {features.map((feature) => {

            const Icon = feature.icon;

            return (
              <div
                key={feature.title}
                className="rounded-2xl border bg-slate-50 p-8 hover:shadow-xl transition"
              >
                <Icon
                  size={40}
                  className="text-indigo-600"
                />

                <h3 className="mt-6 text-xl font-semibold">
                  {feature.title}
                </h3>

                <p className="mt-4 text-slate-600">
                  {feature.description}
                </p>
              </div>
            );
          })}

        </div>

      </div>
    </section>
  );
}

export default Features;
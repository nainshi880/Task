import {
  CalendarCheck,
  UserCheck,
  CheckCircle2,
} from "lucide-react";

const steps = [
  {
    icon: CalendarCheck,
    title: "Book Service",
    description:
      "Choose your required service, date and preferred time.",
  },
  {
    icon: UserCheck,
    title: "Technician Assigned",
    description:
      "We assign the most suitable verified technician nearby.",
  },
  {
    icon: CheckCircle2,
    title: "Job Completed",
    description:
      "Track progress in real time and securely complete payment.",
  },
];

function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="bg-slate-50 py-24"
    >
      <div className="max-w-7xl mx-auto px-6">

        <div className="text-center">

          <h2 className="text-4xl font-bold">

            How It Works

          </h2>

          <p className="mt-4 text-slate-600">

            Book your service in just three simple steps.

          </p>

        </div>

        <div className="mt-20 grid gap-10 lg:grid-cols-3">

          {steps.map((step, index) => {

            const Icon = step.icon;

            return (
              <div
                key={step.title}
                className="relative rounded-2xl bg-white p-10 shadow-md text-center"
              >

                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100">

                  <Icon
                    size={38}
                    className="text-indigo-600"
                  />

                </div>

                <span className="absolute top-6 right-6 text-5xl font-bold text-slate-100">

                  0{index + 1}

                </span>

                <h3 className="mt-8 text-2xl font-semibold">

                  {step.title}

                </h3>

                <p className="mt-4 text-slate-600">

                  {step.description}

                </p>

              </div>
            );
          })}

        </div>
      </div>
    </section>
  );
}

export default HowItWorks;
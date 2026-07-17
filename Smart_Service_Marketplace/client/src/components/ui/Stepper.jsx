import { Check } from "lucide-react";
import clsx from "clsx";

function Stepper({ steps = [], currentStep = 0 }) {
  return (
    <ol
      className="mb-8 grid gap-2"
      style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}
    >
      {steps.map((step, index) => {
        const active = index === currentStep;
        const complete = index < currentStep;

        return (
          <li key={step.id || step.label} className="text-center">
            <div
              className={clsx(
                "mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold",
                complete && "bg-emerald-500 text-white",
                active && "bg-indigo-600 text-white",
                !complete && !active && "bg-slate-200 text-slate-500"
              )}
            >
              {complete ? <Check size={16} /> : index + 1}
            </div>
            <p
              className={clsx(
                "mt-2 hidden text-xs font-medium sm:block",
                active ? "text-indigo-700" : "text-slate-500"
              )}
            >
              {step.label}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

export default Stepper;

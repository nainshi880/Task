import clsx from "clsx";
import { Check } from "lucide-react";

import { JOB_FLOW_STEPS, getJobFlowStepIndex } from "../../constants/technicianJobs";

function JobStatusFlow({ status, hasArriving = false }) {
  const current = getJobFlowStepIndex(status, hasArriving);

  if (current < 0) {
    return null;
  }

  return (
    <ol className="grid gap-2 sm:grid-cols-5">
      {JOB_FLOW_STEPS.map((step, index) => {
        const complete = index < current;
        const active = index === current;

        return (
          <li key={step.id} className="text-center">
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
                "mt-2 text-xs font-medium",
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

export default JobStatusFlow;

import { Link } from "react-router-dom";
import clsx from "clsx";

const ACCENTS = {
  indigo: {
    icon: "bg-indigo-50 text-indigo-600",
    bar: "bg-indigo-500",
    soft: "from-indigo-50/80 to-white",
  },
  emerald: {
    icon: "bg-emerald-50 text-emerald-600",
    bar: "bg-emerald-500",
    soft: "from-emerald-50/80 to-white",
  },
  amber: {
    icon: "bg-amber-50 text-amber-600",
    bar: "bg-amber-500",
    soft: "from-amber-50/80 to-white",
  },
  sky: {
    icon: "bg-sky-50 text-sky-600",
    bar: "bg-sky-500",
    soft: "from-sky-50/80 to-white",
  },
  violet: {
    icon: "bg-violet-50 text-violet-600",
    bar: "bg-violet-500",
    soft: "from-violet-50/80 to-white",
  },
  rose: {
    icon: "bg-rose-50 text-rose-600",
    bar: "bg-rose-500",
    soft: "from-rose-50/80 to-white",
  },
};

export function DashboardStatCard({
  label,
  value,
  icon: Icon,
  accent = "indigo",
  hint,
}) {
  const theme = ACCENTS[accent] || ACCENTS.indigo;

  return (
    <div
      className={clsx(
        "group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md",
        theme.soft
      )}
    >
      <div
        className={clsx(
          "absolute inset-y-0 left-0 w-1 rounded-l-2xl opacity-80",
          theme.bar
        )}
      />
      <div className="flex items-start justify-between gap-3 pl-1">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 truncate text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
          {hint ? (
            <p className="mt-1 text-xs text-slate-400">{hint}</p>
          ) : null}
        </div>
        <div
          className={clsx(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition group-hover:scale-105",
            theme.icon
          )}
        >
          <Icon size={22} strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}

export function DashboardWelcome({
  greeting,
  title,
  subtitle,
  avatarUrl,
  avatarFallback,
  children,
  actions,
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-slate-900 p-6 text-white shadow-lg md:p-8">
      <div
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-indigo-500/30 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-24 left-1/3 h-48 w-48 rounded-full bg-cyan-400/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "22px 22px",
        }}
        aria-hidden
      />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="h-16 w-16 rounded-2xl border border-white/20 object-cover shadow-lg"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-2xl font-bold ring-1 ring-white/20">
              {avatarFallback}
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-indigo-200">{greeting}</p>
            <h1 className="mt-0.5 text-2xl font-bold tracking-tight md:text-3xl">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-1 max-w-xl text-sm text-slate-300">{subtitle}</p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
          {children}
          {actions}
        </div>
      </div>
    </section>
  );
}

export function DashboardMetaPill({ label, value, icon: Icon }) {
  return (
    <div className="min-w-[7.5rem] rounded-xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">
        {label}
      </p>
      <p className="mt-1 flex items-center gap-1.5 text-xl font-bold">
        {Icon ? <Icon size={18} className="text-amber-300" /> : null}
        {value}
      </p>
    </div>
  );
}

export function DashboardQuickActions({ actions = [] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <Link
            key={action.to + action.label}
            to={action.to}
            className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
          >
            <span
              className={clsx(
                "flex h-10 w-10 items-center justify-center rounded-xl transition group-hover:scale-105",
                action.tone || "bg-indigo-50 text-indigo-600"
              )}
            >
              <Icon size={18} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-slate-900">
                {action.label}
              </span>
              {action.description ? (
                <span className="mt-0.5 block truncate text-xs text-slate-500">
                  {action.description}
                </span>
              ) : null}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

export function DashboardSection({
  title,
  subtitle,
  action,
  children,
  className,
}) {
  return (
    <section
      className={clsx(
        "rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm md:p-6",
        className
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function DashboardEmpty({ icon: Icon, message, actionLabel, actionTo }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-10 text-center">
      {Icon ? (
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm ring-1 ring-slate-200">
          <Icon size={20} />
        </div>
      ) : null}
      <p className="text-sm text-slate-500">{message}</p>
      {actionLabel && actionTo ? (
        <Link
          to={actionTo}
          className="mt-3 text-sm font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

export function DashboardLink({ to, children }) {
  return (
    <Link
      to={to}
      className="shrink-0 text-sm font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
    >
      {children}
    </Link>
  );
}

export function WorkloadBar({ current = 0, max = 5 }) {
  const safeMax = Math.max(Number(max) || 1, 1);
  const value = Math.min(Math.max(Number(current) || 0, 0), safeMax);
  const pct = Math.round((value / safeMax) * 100);

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs text-slate-500">
        <span>Current load</span>
        <span className="font-medium text-slate-700">
          {value}/{safeMax}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={clsx(
            "h-full rounded-full transition-all duration-500",
            pct >= 90 ? "bg-rose-500" : pct >= 60 ? "bg-amber-500" : "bg-emerald-500"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

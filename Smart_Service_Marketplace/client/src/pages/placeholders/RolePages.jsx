import DashboardLayout from "../../layouts/DashboardLayout";

function PageShell({ title, description }) {
  return (
    <DashboardLayout>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
        {description && <p className="text-slate-500">{description}</p>}
      </div>
    </DashboardLayout>
  );
}

export function CustomerChat() {
  return (
    <PageShell
      title="Chat"
      description="Message your assigned technicians."
    />
  );
}

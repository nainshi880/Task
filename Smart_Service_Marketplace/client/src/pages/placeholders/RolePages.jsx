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

export function CustomerBookings() {
  return (
    <PageShell
      title="My Bookings"
      description="Track and manage your service bookings."
    />
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

export function TechnicianDashboard() {
  return (
    <PageShell
      title="Technician Dashboard"
      description="Jobs, earnings snapshot, and performance overview."
    />
  );
}

export function TechnicianJobs() {
  return (
    <PageShell
      title="My Jobs"
      description="View and update assigned service jobs."
    />
  );
}

export function TechnicianEarnings() {
  return (
    <PageShell
      title="Earnings"
      description="Track payouts and completed job earnings."
    />
  );
}

export function TechnicianProfile() {
  return (
    <PageShell
      title="Technician Profile"
      description="Update skills, availability, and documents."
    />
  );
}

export function AdminDashboard() {
  return (
    <PageShell
      title="Admin Dashboard"
      description="Platform metrics, users, and booking activity."
    />
  );
}

export function AdminUsers() {
  return (
    <PageShell
      title="Users"
      description="Manage customers and account status."
    />
  );
}

export function AdminBookings() {
  return (
    <PageShell
      title="Bookings"
      description="Oversee and manage all platform bookings."
    />
  );
}

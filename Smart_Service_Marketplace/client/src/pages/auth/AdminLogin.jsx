import AuthLayout from "../../layouts/AuthLayout";
import Card from "../../components/ui/Card";
import AdminLoginForm from "../../components/forms/AdminLoginForm";

function AdminLogin() {
  return (
    <AuthLayout
      title="Admin Sign In"
      subtitle="Access the marketplace control panel"
    >
      <Card className="shadow-2xl">
        <AdminLoginForm />
      </Card>
    </AuthLayout>
  );
}

export default AdminLogin;

import { Link } from "react-router-dom";
import AuthLayout from "../../layouts/AuthLayout";
import Card from "../../components/ui/Card";
import ResetPasswordForm from "../../components/forms/ResetPasswordForm";

function ResetPassword() {
  return (
    <AuthLayout
      title="Reset password"
      subtitle="Choose a new secure password for your account."
    >
      <Card className="shadow-2xl">
        <ResetPasswordForm />

        <div className="mt-8 text-center">
          <Link
            to="/login"
            className="text-sm font-semibold text-indigo-600 hover:underline"
          >
            Back to login
          </Link>
        </div>
      </Card>
    </AuthLayout>
  );
}

export default ResetPassword;

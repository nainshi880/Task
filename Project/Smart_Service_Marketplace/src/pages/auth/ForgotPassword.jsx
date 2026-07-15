import { Link } from "react-router-dom";

import AuthLayout from "../../layouts/AuthLayout";
import Card from "../../components/ui/Card";
import ForgotPasswordForm from "../../components/forms/ForgotPasswordForm";

function ForgotPassword() {
  return (
    <AuthLayout
      title="Forgot Password?"
      subtitle="Enter your email to receive a password reset link."
    >
      <Card className="shadow-2xl">

        <ForgotPasswordForm />

        <div className="mt-8 text-center">

          <Link
            to="/login"
            className="font-semibold text-indigo-600 hover:underline"
          >
            Back to Login
          </Link>

        </div>

      </Card>
    </AuthLayout>
  );
}

export default ForgotPassword;
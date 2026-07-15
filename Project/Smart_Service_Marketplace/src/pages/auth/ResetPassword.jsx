import AuthLayout from "../../layouts/AuthLayout";
import Card from "../../components/ui/Card";
import ResetPasswordForm from "../../components/forms/ResetPasswordForm";

function ResetPassword() {
  return (
    <AuthLayout
      title="Reset Password"
      subtitle="Create a new secure password."
    >
      <Card className="shadow-2xl">

        <ResetPasswordForm />

      </Card>
    </AuthLayout>
  );
}

export default ResetPassword;
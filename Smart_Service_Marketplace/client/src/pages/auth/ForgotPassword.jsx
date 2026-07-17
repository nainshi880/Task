import AuthLayout from "../../layouts/AuthLayout";
import Card from "../../components/ui/Card";
import ForgotPasswordForm from "../../components/forms/ForgotPasswordForm";

function ForgotPassword() {
  return (
    <AuthLayout
      title="Forgot password"
      subtitle="Recover access in a few quick steps"
      maxWidthClass="max-w-lg"
    >
      <Card className="shadow-2xl">
        <ForgotPasswordForm />
      </Card>
    </AuthLayout>
  );
}

export default ForgotPassword;

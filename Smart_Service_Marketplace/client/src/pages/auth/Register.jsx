import { Link } from "react-router-dom";
import AuthLayout from "../../layouts/AuthLayout";
import Card from "../../components/ui/Card";
import RegisterForm from "../../components/forms/RegisterForm";

function Register() {
  return (
    <AuthLayout
      title="Create account"
      subtitle="Register as a customer or apply as a technician"
      maxWidthClass="max-w-2xl"
    >
      <Card className="shadow-2xl">
        <RegisterForm />

        <div className="mt-8 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-indigo-600 hover:underline">
            Sign in
          </Link>
        </div>
      </Card>
    </AuthLayout>
  );
}

export default Register;

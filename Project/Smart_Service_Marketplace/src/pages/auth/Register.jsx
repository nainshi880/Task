import { Link } from "react-router-dom";

import AuthLayout from "../../layouts/AuthLayout";
import Card from "../../components/ui/Card";

import RegisterForm from "../../components/forms/RegisterForm";

function Register() {
  return (
    <AuthLayout
      title="Create Account"
      subtitle="Join Smart Service Marketplace"
    >

      <Card>

        <RegisterForm />

        <div className="mt-8 text-center">

          <p>

            Already have an account?

            <Link
              to="/login"
              className="ml-2 font-semibold text-indigo-600"
            >
              Login
            </Link>

          </p>

        </div>

      </Card>

    </AuthLayout>
  );
}

export default Register;
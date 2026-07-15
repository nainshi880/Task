import { Link } from "react-router-dom";

import AuthLayout from "../../layouts/AuthLayout";
import Card from "../../components/ui/Card";

import LoginForm from "../../components/forms/LoginForm";

function Login() {
  return (
    <AuthLayout
      title="Welcome Back 👋"
      subtitle="Login to continue"
    >

      <Card>

        <LoginForm />

        <div className="mt-8 text-center">

          <p>

            Don't have an account?

            <Link
              to="/register"
              className="ml-2 font-semibold text-indigo-600"
            >
              Register
            </Link>

          </p>

        </div>

      </Card>

    </AuthLayout>
  );
}

export default Login;
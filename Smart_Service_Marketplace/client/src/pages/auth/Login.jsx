import { Link } from "react-router-dom";
import AuthLayout from "../../layouts/AuthLayout";
import Card from "../../components/ui/Card";
import LoginForm from "../../components/forms/LoginForm";

function Login() {
  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to continue to your account">
      <Card className="shadow-2xl">
        <LoginForm />

        <div className="mt-8 space-y-3 text-center text-sm text-slate-600">
          <p>
            Don&apos;t have an account?{" "}
            <Link to="/register" className="font-semibold text-indigo-600 hover:underline">
              Create one
            </Link>
          </p>
          <p>
            Staff member?{" "}
            <Link to="/admin/login" className="font-semibold text-slate-800 hover:underline">
              Admin portal
            </Link>
          </p>
        </div>
      </Card>
    </AuthLayout>
  );
}

export default Login;

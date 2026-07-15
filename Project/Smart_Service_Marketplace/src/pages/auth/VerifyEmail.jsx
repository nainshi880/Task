import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import toast from "react-hot-toast";

import AuthLayout from "../../layouts/AuthLayout";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";

import * as authService from "../../services/auth.service";

function VerifyEmail() {
  const { token } = useParams();

  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const verify = async () => {
      try {
        await authService.verify(token);

        setVerified(true);

        toast.success("Email verified successfully.");
      } catch (error) {
        toast.error(
          error.response?.data?.message ||
            "Email verification failed."
        );
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [token]);

  return (
    <AuthLayout
      title="Email Verification"
      subtitle="Please wait while we verify your email."
    >
      <Card className="text-center shadow-2xl">

        {loading ? (
          <>
            <h2 className="text-2xl font-semibold">
              Verifying...
            </h2>

            <p className="mt-3 text-slate-500">
              Please wait.
            </p>
          </>
        ) : verified ? (
          <>
            <h2 className="text-3xl font-bold text-green-600">
              Email Verified ✅
            </h2>

            <p className="mt-4 text-slate-600">
              Your account has been successfully verified.
            </p>

            <Link to="/login">

              <Button className="mt-8">
                Login
              </Button>

            </Link>
          </>
        ) : (
          <>
            <h2 className="text-3xl font-bold text-red-600">
              Verification Failed
            </h2>

            <p className="mt-4 text-slate-600">
              This verification link is invalid or has expired.
            </p>

            <Link to="/register">

              <Button className="mt-8">
                Register Again
              </Button>

            </Link>
          </>
        )}

      </Card>
    </AuthLayout>
  );
}

export default VerifyEmail;
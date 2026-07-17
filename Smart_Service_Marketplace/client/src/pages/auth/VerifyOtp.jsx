import { Link } from "react-router-dom";
import AuthLayout from "../../layouts/AuthLayout";
import Card from "../../components/ui/Card";
import VerifyOtpForm from "../../components/forms/VerifyOtpForm";

function VerifyOtp() {
  return (
    <AuthLayout
      title="Verify OTP"
      subtitle="Confirm your phone number with a one-time code."
    >
      <Card className="shadow-2xl">
        <VerifyOtpForm />

        <div className="mt-8 text-center text-sm text-slate-600">
          <Link to="/login" className="font-semibold text-indigo-600 hover:underline">
            Back to login
          </Link>
        </div>
      </Card>
    </AuthLayout>
  );
}

export default VerifyOtp;

import AuthLayout from "../../layouts/AuthLayout";
import CustomerProfileSetupWizard from "../../components/forms/CustomerProfileSetupWizard";

function CustomerProfileSetup() {
  return (
    <AuthLayout
      title="Profile Setup"
      subtitle="Finish your customer profile to start booking services."
      maxWidthClass="max-w-xl"
    >
      <CustomerProfileSetupWizard />
    </AuthLayout>
  );
}

export default CustomerProfileSetup;

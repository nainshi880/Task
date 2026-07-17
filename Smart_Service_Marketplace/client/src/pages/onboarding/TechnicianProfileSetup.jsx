import AuthLayout from "../../layouts/AuthLayout";
import TechnicianProfileSetupWizard from "../../components/forms/TechnicianProfileSetupWizard";

function TechnicianProfileSetup() {
  return (
    <AuthLayout
      title="Technician Setup"
      subtitle="Complete your profile so customers can find and book you."
      maxWidthClass="max-w-2xl"
    >
      <TechnicianProfileSetupWizard />
    </AuthLayout>
  );
}

export default TechnicianProfileSetup;

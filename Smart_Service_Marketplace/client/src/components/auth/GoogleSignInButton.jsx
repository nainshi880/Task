import { useState } from "react";
import toast from "react-hot-toast";
import Button from "../ui/Button";
import { isFirebaseAuthConfigured, signInWithGooglePopup } from "../../lib/firebase";

function GoogleGlyph({ className = "h-5 w-5" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.3h6.44a5.5 5.5 0 0 1-2.39 3.61v3h3.87c2.26-2.08 3.57-5.15 3.57-8.64z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.87-3a7.2 7.2 0 0 1-10.78-3.78H1.28v3.09A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.31a7.18 7.18 0 0 1 0-4.62V6.6H1.28a12 12 0 0 0 0 10.8l4-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.45-3.45C17.94 1.14 15.24 0 12 0 7.31 0 3.26 2.69 1.28 6.6l4 3.09A7.19 7.19 0 0 1 12 4.75z"
      />
    </svg>
  );
}

/**
 * Google Sign-In button (customer or technician).
 * Calls onSuccess({ idToken, user }) after Firebase popup succeeds.
 */
function GoogleSignInButton({
  onSuccess,
  onError,
  disabled = false,
  className = "",
  label = "Continue with Google",
}) {
  const [loading, setLoading] = useState(false);
  const configured = isFirebaseAuthConfigured();

  const handleClick = async () => {
    if (!configured) {
      const message =
        "Google sign-in is not configured. Add VITE_FIREBASE_* keys and enable Google in Firebase Auth.";
      toast.error(message);
      onError?.(new Error(message));
      return;
    }

    setLoading(true);
    try {
      const result = await signInWithGooglePopup();
      await onSuccess?.(result);
    } catch (error) {
      if (error?.code === "auth/popup-closed-by-user") {
        toast("Google sign-in cancelled.");
      } else if (error?.code === "auth/popup-blocked") {
        toast.error("Popup blocked. Allow popups for this site and try again.");
      } else {
        const message =
          error?.message || "Google sign-in failed. Please try again.";
        toast.error(message);
      }
      onError?.(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className={`w-full ${className}`}
      size="lg"
      loading={loading}
      disabled={disabled || loading}
      onClick={handleClick}
    >
      {!loading && <GoogleGlyph />}
      {loading ? "Connecting…" : label}
    </Button>
  );
}

export default GoogleSignInButton;

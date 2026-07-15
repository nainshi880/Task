import { Navigate } from "react-router-dom";

import Loader from "../components/ui/Loader";

import useAuth from "../hooks/useAuth";

function ProtectedRoute({ children }) {

  const {
    token,
    loading,
  } = useAuth();

  if (loading) {
    return (
      <Loader
        text="Checking Authentication..."
      />
    );
  }

  if (!token) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return children;
}

export default ProtectedRoute;
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContetxt";

function ProtectedRoute({children}){
  const {isAuthenticated, loading} = useAuth();

  if(loading){
    return <p>Checking authentication...</p>
  }

  if(!isAuthenticated){
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
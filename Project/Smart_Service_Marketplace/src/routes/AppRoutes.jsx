import { Routes, Route } from "react-router-dom";

const Home = () => <h1>Landing Page</h1>;
const Login = () => <h1>Login</h1>;
const Register = () => <h1>Register</h1>;
const Dashboard = () => <h1>Dashboard</h1>;

import ProtectedRoute from "./ProtectedRoute";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />

      <Route path="/login" element={<Login />} />

      <Route path="/register" element={<Register />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default AppRoutes;
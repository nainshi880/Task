import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div style={{ padding: "30px" }}>
      <h1>Dashboard</h1>
      <p>Welcome, {user?.name}</p>
      <p>Email: {user?.email}</p>

      <button onClick={handleLogout}>Logout</button>
    </div>
  );
}

export default Dashboard;
import AddEmployeeForm from "./components/AddEmployeeForm";
import EmployeeList from "./components/EmployeeList";

function App() {
  return (
    <div style={{ padding: "20px", fontFamily: "Arial" }}>
      <h1>Week 2 - Day 4: React Query API Calls</h1>

      <AddEmployeeForm />
      <hr />
      <EmployeeList />
    </div>
  );
}

export default App;
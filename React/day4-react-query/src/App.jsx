import EmployeeForm from "./components/EmployeeForm";
import EmployeeList from "./components/EmployeeList";

function App() {
  return (
    <div
      style={{
        width: "700px",
        margin: "40px auto",
        fontFamily: "Arial",
      }}
    >
      <h1>Employee Registration Module</h1>

      <EmployeeForm />

      <EmployeeList />
    </div>
  );
}

export default App;
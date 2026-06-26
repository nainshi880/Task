import { useQuery } from "@tanstack/react-query";
import { fetchEmployees } from "../services/employeeService";

function EmployeeList() {
  const {
    data: employees,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["employees"],
    queryFn: fetchEmployees,
  });

  if (isLoading) {
    return <p>Loading employees...</p>;
  }

  if (error) {
    return <p style={{ color: "red" }}>Failed to load employees</p>;
  }

  return (
    <div>
      <h2>Employee List</h2>

      {employees.length === 0 ? (
        <p>No employees found</p>
      ) : (
        <ul>
          {employees.map((employee) => (
            <li key={employee.id}>
              {employee.name} - {employee.department} - ₹{employee.salary}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default EmployeeList;
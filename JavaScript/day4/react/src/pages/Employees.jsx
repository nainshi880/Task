import { useEffect, useState } from "react";
import { getEmployees } from "../services/employeeService";

function Employees() {
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    const fetchEmployees = async () => {
           try {
            const data = await getEmployees();
            setEmployees(data);
           }catch(error){
            console.error("Error in fetching employees:",error);
           }
    };
    fetchEmployees();
  }, []);
  return (
    <div>
      <h1>Employees</h1>
      {employees.length === 0 ? (
        <p>No employees found</p>
      ) : (
        employees.map((emp) => (
          <div key={emp.id}>
            <p>{emp.name}</p>
          </div>
        ))
      )}
    </div>
  );
}

export default Employees;
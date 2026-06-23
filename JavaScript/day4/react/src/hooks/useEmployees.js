import { useEffect, useState } from "react";
import { getEmployees } from "../services/employeeService";

function useEmployees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const data = await getEmployees();
        setEmployees(data);
      } catch (err) {
        setError("Failed to fetch employees");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, []);

  return { employees, loading, error };
}

export default useEmployees;
import { useState } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import {
  getEmployees,
  deleteEmployee,
} from "../services/employeeService";

function EmployeeList() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: getEmployees,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEmployee,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["employees"],
      });
    },
  });

  const filteredEmployees = data.filter((emp) =>
    emp.name.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return <h3>Loading Employees...</h3>;
  }

  return (
    <div>

      <h2>Employee List</h2>

      <input
        placeholder="Search Employee..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          marginBottom: 20,
          padding: 8,
          width: "250px",
        }}
      />

      {filteredEmployees.length === 0 ? (
        <p>No Employee Found</p>
      ) : (
        filteredEmployees.map((emp) => (
          <div
            key={emp.id}
            style={{
              border: "1px solid gray",
              padding: 15,
              marginBottom: 15,
              borderRadius: 8,
            }}
          >
            <h3>{emp.name}</h3>

            <p>Email : {emp.email}</p>

            <p>Department : {emp.department}</p>

            <p>Salary : ₹{emp.salary}</p>

            <button
              onClick={() => deleteMutation.mutate(emp.id)}
            >
              Delete
            </button>

          </div>
        ))
      )}

    </div>
  );
}

export default EmployeeList;
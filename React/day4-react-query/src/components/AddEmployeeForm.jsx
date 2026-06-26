import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addEmployee } from "../services/employeeService";

function AddEmployeeForm() {
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: "",
    department: "",
    salary: "",
  });

  const mutation = useMutation({
    mutationFn: addEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });

      setFormData({
        name: "",
        department: "",
        salary: "",
      });
    },
  });

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]:
        e.target.name === "salary" ? Number(e.target.value) : e.target.value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.name || !formData.department || !formData.salary) {
      return;
    }

    mutation.mutate(formData);
  };

  return (
    <div style={{ marginBottom: "30px" }}>
      <h2>Add Employee</h2>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "10px" }}>
          <input
            type="text"
            name="name"
            placeholder="Employee name"
            value={formData.name}
            onChange={handleChange}
          />
        </div>

        <div style={{ marginBottom: "10px" }}>
          <input
            type="text"
            name="department"
            placeholder="Department"
            value={formData.department}
            onChange={handleChange}
          />
        </div>

        <div style={{ marginBottom: "10px" }}>
          <input
            type="number"
            name="salary"
            placeholder="Salary"
            value={formData.salary}
            onChange={handleChange}
          />
        </div>

        <button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Adding..." : "Add Employee"}
        </button>

        {mutation.isError && (
          <p style={{ color: "red" }}>Failed to add employee</p>
        )}

        {mutation.isSuccess && (
          <p style={{ color: "green" }}>Employee added successfully!</p>
        )}
      </form>
    </div>
  );
}

export default AddEmployeeForm;
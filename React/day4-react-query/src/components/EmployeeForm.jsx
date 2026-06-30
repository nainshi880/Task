import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addEmployee } from "../services/employeeService";

function EmployeeForm() {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  const mutation = useMutation({
    mutationFn: addEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["employees"],
      });

      reset();
    },
  });

  const onSubmit = (data) => {
    data.salary = Number(data.salary);
    mutation.mutate(data);
  };

  return (
    <div style={styles.formContainer}>
      <h2>Employee Registration</h2>

      <form onSubmit={handleSubmit(onSubmit)}>

        <input
          placeholder="Employee Name"
          {...register("name", {
            required: "Name is required",
          })}
        />

        <p style={styles.error}>{errors.name?.message}</p>

        <input
          placeholder="Email"
          {...register("email", {
            required: "Email is required",
            pattern: {
              value: /^\S+@\S+$/i,
              message: "Invalid email",
            },
          })}
        />

        <p style={styles.error}>{errors.email?.message}</p>

        <input
          placeholder="Department"
          {...register("department", {
            required: "Department is required",
          })}
        />

        <p style={styles.error}>{errors.department?.message}</p>

        <input
          type="number"
          placeholder="Salary"
          {...register("salary", {
            required: "Salary is required",
          })}
        />

        <p style={styles.error}>{errors.salary?.message}</p>

        <button type="submit">
          {mutation.isPending ? "Adding..." : "Register Employee"}
        </button>

      </form>
    </div>
  );
}

const styles = {
  formContainer: {
    border: "1px solid #ddd",
    padding: 20,
    borderRadius: 8,
    marginBottom: 30,
  },

  error: {
    color: "red",
    marginTop: 2,
    marginBottom: 10,
    fontSize: 13,
  },
};

export default EmployeeForm;
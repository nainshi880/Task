function EmployeeCard({ employee }) {
  return (
    <div style={{ border: "1px solid #ccc", padding: "10px", marginBottom: "10px" }}>
      <h3>{employee.name}</h3>
      <p>Department: {employee.department}</p>
      <p>Salary: ₹{employee.salary}</p>
    </div>
  );
}

export default EmployeeCard;
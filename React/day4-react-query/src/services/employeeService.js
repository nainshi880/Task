let employees = [
  { id: 1, name: "Nainshi", department: "IT", salary: 50000 },
  { id: 2, name: "Rahul", department: "HR", salary: 45000 },
  { id: 3, name: "Priya", department: "Finance", salary: 60000 },
];

export const fetchEmployees = async () => {
  await new Promise((resolve) => setTimeout(resolve, 1000)); // simulate API delay
  return [...employees];
};

export const addEmployee = async (newEmployee) => {
  await new Promise((resolve) => setTimeout(resolve, 1000)); // simulate API delay

  const employee = {
    id: employees.length + 1,
    ...newEmployee,
  };

  employees.push(employee);
  return employee;
};
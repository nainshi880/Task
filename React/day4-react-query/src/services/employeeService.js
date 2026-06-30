let employees = [
  {
    id: 1,
    name: "Nainshi",
    email: "nainshi@gmail.com",
    department: "IT",
    salary: 50000,
  },
];

export const getEmployees = async () => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  return [...employees];
};

export const addEmployee = async (employee) => {
  await new Promise((resolve) => setTimeout(resolve, 500));

  employees.push({
    id: Date.now(),
    ...employee,
  });

  return employee;
};

export const deleteEmployee = async (id) => {
  await new Promise((resolve) => setTimeout(resolve, 500));

  employees = employees.filter((emp) => emp.id !== id);

  return id;
};
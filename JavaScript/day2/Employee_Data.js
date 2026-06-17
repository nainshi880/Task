const employees = [
  {id: 1, name: "Priya", department: "IT", salary: 60000},
  {id: 2, name: "Ram", department: "HR", salary: 30000},
  {id: 3, name: "Payal", department: "Finance", salary: 50000},
  {id: 4, name: "Sidd", department: "Finance", salary: 60000},
  {id: 5, name: "Kunal", department: "IT", salary: 70000},
  {id: 6, name: "Aman", department: "Sales", salary: 80000},
  {id: 7, name: "Reena", department: "IT", salary: 90000},
  {id: 8, name: "Gungun", department: "HR", salary: 40000}
];

function searchEmployee(name) {
  return employees.filter(emp => 
    emp.name.toLowerCase().includes(name.toLowerCase())
  );
}

console.log(searchEmployee("Kun"));

function filterDepartment(department){
  return employees.filter(
    emp => emp.department === department
  );
}
console.log(filterDepartment("IT"));


const ascendingSalary = [...employees].sort(
  (a,b) => a.salary - b.salary
);
console.log(ascendingSalary);

const descendingSalary = [...employees].sort((a,b) => b.salary - a.salary);
console.log(descendingSalary);


function groupByDepartment() {
  return employees.reduce((groups, employee) => {
    const dept = employee.department;
    if(!groups[dept]){
      groups[dept] = [];
    }

    groups[dept].push(employee);
    return groups;
  },{});
}
console.log(groupByDepartment());

function averageSalary() {
  const total = employees.reduce(
    (sum, employee) => sum + employee.salary,0
  );
  return total / employees.length;
}

console.log("Average Salary:", averageSalary());


function highestPaidEmployee(){
  return employees.reduce((highest, employee) => 
    employee.salary > highest.salary ? employee : highest
  );
}
console.log(highestPaidEmployee());
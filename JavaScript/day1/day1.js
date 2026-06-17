//  Closures 
function outer() {
  let count = 0;

  return function inner(){
    count++;
    console.log(count);
  };
}

outer();
outer();


// Scope
let global = "global Variable"

function test() {
  let local = "local Variable";
  console.log(local);
  console.log(global);
}

test();

function myName() {
  var name = "Nainshi";
  function showName() {
    console.log(name);
  }
  showName();
}

myName();


 // Hoisting
console.log(num);
var num = 10;

const x = 5;
{
  console.log(x);
  const x = 9;
}


// Event Loop
console.log("Start");

setTimeout(() => {
    console.log("Timeout");
}, 0);

console.log("End");


// Promise
const promise = new Promise((resolve, reject) => {
  resolve("Data received");
});
promise.then((result) => {
  console.log(result);
});


// Async/Await
async function fetchData() {
  return "hello";
}

async function display() {
  const data = await fetchData();
  console.log(data);
}
display();


// JavaScript Execution Context
let name = "Nainshi";
function greet() {
  console.log("Hello "+ name);
}
greet();


// Memory Management
let user = {
  name: "Ram"
};
user = null;


// <------ES6+ Features-------->

//let and const
let age = 20;
const PI = 3.14;

// Arrow Function
const add = (a,b) => a+b;
console.log(add(2,3));

//Template Literals

const me = "Nainshi";
console.log(`Hello ${me}`);

// Destructuring Assignment
const pro = {id: 1, customer: "John"};
const {customer} = pro;
console.log(customer);

//Spread operators
const arr = [1,2,3,4,5];
const newArr = [...arr,6,7];
console.log(newArr);




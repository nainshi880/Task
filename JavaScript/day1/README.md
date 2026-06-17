<!-- Closures -->

function outer() {
  let count = 0;

  return inner() {
    count++;
    console.log(count);
  }
}

const counter = outer();
counter();
counter();
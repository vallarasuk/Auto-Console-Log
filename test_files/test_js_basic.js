// Basic JS variable declarations
const name = "Alice";
let age = 30;
var score = 100;

function greet(user, greeting) {
  const message = greeting + " " + user;
  let count = 0;
  return message;
}

const add = (a, b) => {
  const result = a + b;
  return result;
};

class Calculator {
  constructor(initialValue) {
    const value = initialValue;
    this.value = value;
  }

  multiply(factor) {
    const product = this.value * factor;
    return product;
  }
}

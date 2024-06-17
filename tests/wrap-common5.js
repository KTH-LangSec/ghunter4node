const { test } = require('uvu');
const assert = require('uvu/assert');
const Wrapper  = require('../src/wrapper.js');
require('../src/buildins');


var output = [];

function log(message) {
  output.push(message);
}

function beforeFuncCallback(accessPath) {
  log('[wrapFunction]: ' + accessPath);
  return true;
}

const w = new Wrapper(log, beforeFuncCallback);

test.before.each(() => {
  output = [];
});

test('TEST5', () => {
  class Animal {
    constructor(name) {
      this.name = name;
    }

    speak() {
      return `${this.name} makes a noise.`;
    }
  }

  class Dog extends Animal {
    constructor(name) {
      super(name); // call the super class constructor and pass in the name parameter
    }

    speak() {
      return `${this.name} barks.`;
    }
  }

  const d = new Dog("Mitzie");
  assert.equal(d.speak(), "Mitzie barks.");

  // const wrapD = w.wrap(d, 'TEST5');
  // wrapD.speak();

  var wrapDog = w.wrap(Dog, 'TEST5');
  const wrapD = new wrapDog("Mitzie");
  assert.equal(wrapD.speak(), "Mitzie barks.");
  assert.equal(output, [
    "[wrapFunction]: TEST5()",
    "[wrapFunction]: TEST5.Dog.prototype.speak()"
  ])
})

test.run();

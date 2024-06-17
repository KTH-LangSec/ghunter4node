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

test('TEST4', () => {
  class Rectangle {
    constructor(height, width) {
      this.height = height;
      this.width = width;
    }
    // Getter
    get area() {
      return this.calcArea();
    }
    // Method
    calcArea() {
      return this.height * this.width;
    }
    *getSides() {
      yield this.height;
      yield this.width;
      yield this.height;
      yield this.width;
    }
  }

  const square = new Rectangle(10, 10);

  assert.equal(square.area, 100);
  assert.equal([...square.getSides()], [10, 10, 10, 10]);

  var wrapRectangle = w.wrap(Rectangle, 'TEST4');
  const wrapSquare = new wrapRectangle(10, 10);

  assert.equal(wrapSquare.area, 100);
  assert.equal([...wrapSquare.getSides()], [10, 10, 10, 10]);
  assert.equal(output, [
    "[WARNING] Not support Generator functions",
    "[wrapFunction]: TEST4()",
    "[WARNING] Not support Generator functions",
    "[wrapFunction]: TEST4.Rectangle.prototype.[getter]area()",
    "[wrapFunction]: TEST4.Rectangle.prototype.calcArea()"
  ]);
});

test.run();

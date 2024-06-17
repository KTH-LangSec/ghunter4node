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

test('TEST7', () => {
  class SimpleClass {
    static foo() {
      return 'CALL STATIC foo';
    }
  }

  var wrappedSimpleClass = w.wrap(SimpleClass, 'TEST7');
  assert.equal(wrappedSimpleClass.foo(), 'CALL STATIC foo');
  assert.equal(output, ["[wrapFunction]: TEST7.SimpleClass.foo()"]);
})

test.run();

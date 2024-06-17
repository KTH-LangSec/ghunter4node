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

test('TEST2', () => {
  let Type = function(name) {
    this.name = name;
  };

  Type.prototype.log = function log(arg1) {
    return "This is class w/ name: " + this.name + "; and argument: " + arg1;
  }

  var wrapType = w.wrap(Type, 'TEST2');
  var t = new wrapType("OBJ1");

  assert.equal(t.log("ARG"), "This is class w/ name: OBJ1; and argument: ARG");

  assert.equal((new Type('name')) instanceof Type, true);
  assert.equal(t instanceof Type, true);
  assert.equal((new Type('name')) instanceof wrapType, true);
  assert.equal(t instanceof wrapType, true);

  assert.equal(output, [
    '[wrapFunction]: TEST2()',
    '[wrapFunction]: TEST2.Type.prototype.log()'
  ]);
})


test.run();

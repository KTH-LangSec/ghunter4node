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

test('TEST3', () => {
  let Type = function(name) {
    this.name = name;
  };

  Type.prototype.log = function log(arg1) {
    return "This is class w/ name: " + this.name + "; and argument: " + arg1;
  }

  var exp = {
    klass: Type
  }

  var wrapObj = w.wrap(exp, 'TEST3');
  var k = new wrapObj.klass('klassName');


  assert.equal(k.log('ARG123'), "This is class w/ name: klassName; and argument: ARG123");
  assert.equal(output, [
    '[wrapFunction]: TEST3.klass()',
    '[wrapFunction]: TEST3.klass.Type.prototype.log()'
  ]);

});

test.run();

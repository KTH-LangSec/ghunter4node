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

test('TEST1 - Basic', () => {
  var testObj = {
    name: "name of obj",
    log: function() {
      return "TEST: " + this.name;
    }
  }

  var wrapObj = w.wrap(testObj, 'TEST1');
  wrapObj.name = 'new Name'

  assert.equal(wrapObj.log(), 'TEST: new Name');
  assert.equal(output, ['[wrapFunction]: TEST1.log()'])
});

test.run();

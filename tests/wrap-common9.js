const { test } = require('uvu');
const assert = require('uvu/assert');
const Wrapper  = require('../src/wrapper.js');
require('../src/buildins');


var output = [];

function log(message) {
  output.push(message);
}

function beforeFuncCallback(accessPath) {
  log('[wrapFunction]: ' + accessPath)
  return true;
}

const w = new Wrapper(log, beforeFuncCallback);

test.before.each(() => {
  output = [];
});

test('TEST9 - Array', () => {
  const arr = [
    { prop: function foo() { console.log("CALL foo") }},
    function () { console.log("CALL func from an array") }
  ]
  const proxy = w.wrap(arr, 'TEST9');

  // proxy[0].prop();
  // proxy[1]();

  for (const item of proxy) {
    if (item.prop)
      item.prop();
    else
      item();
  }

  assert.equal(output, [
    "[wrapFunction]: TEST9.0.prop()",
    "[wrapFunction]: TEST9.1()"
  ])
});

test.run();

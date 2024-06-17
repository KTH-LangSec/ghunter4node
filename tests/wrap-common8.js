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

test('TEST8 - Map', () => {
  const proxyMap = w.wrap(Map, 'TEST0');
  const proxy = new proxyMap();

  proxyMap.prototype.set.call(proxy, "AAA", "BBB");
  assert.equal(output, [
    '[wrapFunction]: TEST0()',
    '[wrapFunction]: TEST0.Map.prototype.set()'
  ])
});

test.run();

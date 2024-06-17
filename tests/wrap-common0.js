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

test('TEST0 - Map', () => {
  const proxyMap = w.wrap(Map, 'TEST0');
  const proxy = new proxyMap();

  assert.equal(proxy.size, 0);
  proxy.clear();
  proxy.set("AAA", "BBB");
  assert.equal(proxy.size, 1);
  assert.equal(output, [
    '[wrapFunction]: TEST0()',
    '[wrapFunction]: TEST0.Map.prototype.[getter]size()',
    '[wrapFunction]: TEST0.Map.prototype.clear()',
    '[wrapFunction]: TEST0.Map.prototype.set()',
    '[wrapFunction]: TEST0.Map.prototype.[getter]size()'
  ])
});

test('TEST0 - new Map', () => {
  const proxy = w.wrap(new Map(), 'TEST0');

  assert.equal(proxy.size, 0);
  proxy.clear();
  proxy.set("AAA", "BBB");
  assert.equal(proxy.size, 1);
  assert.equal(output, [
    '[wrapFunction]: TEST0.Map.prototype.[getter]size()',
    '[wrapFunction]: TEST0.Map.prototype.clear()',
    '[wrapFunction]: TEST0.Map.prototype.set()',
    '[wrapFunction]: TEST0.Map.prototype.[getter]size()'
  ])
});

test.run();

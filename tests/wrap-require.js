const Wrapper  = require('../src/wrapper.js');
require('../src/buildins');

const { inspect } = require('util')

function log(message) {
  console.log(message);
}

function beforeFuncCallback(accessPath, args) {
  log('[call]: ' + accessPath)
  if (accessPath === "REQUIRE('assert')") {
    return false;
  }

  return true;
}

function afterFuncCallback(accessPath, args, ret) {
  log('[ret]:  ' + accessPath + '-->' + inspect(ret, {breakLength: Infinity}))
}

const w = new Wrapper(log, beforeFuncCallback, afterFuncCallback);

const Module = require('module');
Module.prototype.require = w.wrap(Module.prototype.require, 'REQUIRE');

const path = require('path')
path.resolve('aaa', 'bbb')

const Wrapper  = require('../src/wrapper.js');
require('../src/buildins');

function log(message) {
  console.log(message);
}

function beforeFuncCallback(accessPath) {
  log('[before]: ' + accessPath + '()')
}

function afterFuncCallback(accessPath) {
  log(' [after]: ' + accessPath + '()')
}

const w = new Wrapper(log, beforeFuncCallback, afterFuncCallback);

// try - catch
const { ESMLoader } = require('internal/modules/esm/loader');

console.log('START:');
console.log(ESMLoader.prototype.import)
ESMLoader.prototype.import = w.wrap(ESMLoader.prototype.import, 'IMPORT')
console.log(ESMLoader.prototype.import)

async function asyncFunc() {
  const m = await import('./file.mjs');
  m.default();
}

asyncFunc();

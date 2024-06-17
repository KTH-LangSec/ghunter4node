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

test('TEST6', () => {
  class JSTransferableCPP {
    static addAddress() {
      return 'CALL STATIC addAddress';
    }

    foo() {
      return 'CALL foo';
    }
  }

  const internalCPP = {
  }


  const JSTransferable = w.wrap(JSTransferableCPP, 'INTERNAL')

  class BlockList extends JSTransferable {
    constructor() {
      super();
    }

    addAddress(address, family = 'ipv4') {
      return `CALL addAddress\n${this.foo()}\n${BlockList.addAddress()}`;
    }
  }

  const bl = new BlockList()
  assert.equal(bl.addAddress('1'), "CALL addAddress\nCALL foo\nCALL STATIC addAddress");
  assert.equal(output, [
    "[wrapFunction]: INTERNAL()",
    "[wrapFunction]: INTERNAL().__proto__.constructor.BlockList.prototype.addAddress()",
    //"[wrapFunction]: INTERNAL().__proto__.addAddress()",
    "[wrapFunction]: INTERNAL.JSTransferableCPP.prototype.foo()",
    "[wrapFunction]: INTERNAL.JSTransferableCPP.addAddress()"
  ]);
})

test.run();

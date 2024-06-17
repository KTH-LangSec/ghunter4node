// Flags: --experimental-vm-modules

import vm from 'vm';
const m = new vm.SyntheticModule(['n/a'], () => { }); // here

await m.link(() => { });
await m.evaluate();

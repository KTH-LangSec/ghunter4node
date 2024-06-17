const vm = require("vm");

vm.runInNewContext("1+1");
global.text = ' '
const fn = vm.compileFunction(`console.log('' + text)`);
fn();

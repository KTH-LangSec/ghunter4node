const { spawn, spawnSync } = require('child_process');
const path = require('path');

const nodePath = path.join(__dirname, '../node/out/Release/node');

function run(jsCode) {
  spawnSync(nodePath, ['-e', jsCode], {
      stdio: 'inherit',
  });
}

module.exports = {
  run
}

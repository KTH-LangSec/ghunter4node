const cp = require('child_process');

var p = cp.exec('echo "NORMAL EXECUTION"');

// p.stdout.on('data', (data) => {
//   console.log(`Output: ${data}`);
// });

// p.stderr.on('data', (data) => {
//   console.error(`Error: ${data}`);
// });

// p.on('close', (code) => {
//   console.log(`Process exited with code ${code}`);
// });

// p.on('error', (err) => {
//   console.error(`Spawned process error: ${err}`);
// });

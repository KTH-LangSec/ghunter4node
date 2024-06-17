const cp = require('child_process');

cp.fork(`${__dirname}/sample-fork.js`, { env: { AAA: "BBB" } });

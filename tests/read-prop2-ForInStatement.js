const { test } = require('uvu');
const assert = require('uvu/assert');
const { cleanLogs, readOneLogFile } = require("../src/nodejs-taint-log-reader");
const { run } = require('../src/nodejs-taint-runner');

test.before.each(() => {
  cleanLogs();
});

test('ForInStatement 1', () => {
  run("for(let y in ({})){}");
  const log = readOneLogFile();
  assert.ok(log.some(line => line.match(/\[LoadIC::Load\] NOT FOUND: ForIn>/)))
});

test('ForInStatement 2', () => {
  run("for(let y in (Object.create(null))){}");
  const log = readOneLogFile();
  assert.not(log.some(line => line.match(/\[LoadIC::Load\] NOT FOUND: ForIn>/)))
});

test.run();

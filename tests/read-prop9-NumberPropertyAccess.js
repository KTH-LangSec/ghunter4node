const { test } = require('uvu');
const assert = require('uvu/assert');
const { cleanLogs, readOneLogFile } = require("../src/nodejs-taint-log-reader");
const { run } = require('../src/nodejs-taint-runner');

test.before.each(() => {
  cleanLogs();
});

test('NumberPropertyAccess 1', () => {
  run('const o = {}; o[123];');
  const log = readOneLogFile();
  assert.ok(log.some(line => line == '[Runtime::GetObjectProperty] NOT FOUND: 123'))
});

test('NumberPropertyAccess 2', () => {
  run('const o = []; o[134];');
  const log = readOneLogFile();
  assert.ok(log.some(line => line == '[Runtime::GetObjectProperty] NOT FOUND: 134'))
});

test('NumberPropertyAccess 3', () => {
  run('const o = Object.create(null); o[123];');
  const log = readOneLogFile();
  assert.not(log.some(line => line == '[Runtime::GetObjectProperty] NOT FOUND: 123'))
});

test.run();

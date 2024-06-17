const { test } = require('uvu');
const assert = require('uvu/assert');
const { cleanLogs, readOneLogFile } = require("../src/nodejs-taint-log-reader");
const { run } = require('../src/nodejs-taint-runner');

test.before.each(() => {
  cleanLogs();
});

test('ArrowFunctionDeclaration 1', () => {
  run("(({y}) => (0))({})");
  const log = readOneLogFile();
  assert.ok(log.some(line => line.match(/\[LoadIC::Load\] NOT FOUND: .+ <String\[1\]: #y>/)))
});

test('ArrowFunctionDeclaration 2', () => {
  run("(({y}, a, {z}) => (0))({}, 0, {})");
  const log = readOneLogFile();
  assert.ok(log.some(line => line.match(/\[LoadIC::Load\] NOT FOUND: .+ <String\[1\]: #y>/)))
  assert.ok(log.some(line => line.match(/\[LoadIC::Load\] NOT FOUND: .+ <String\[1\]: #z>/)))
});

test('ArrowFunctionDeclaration 3', () => {
  run("(({y: z}) => (0))({})");
  const log = readOneLogFile();
  assert.ok(log.some(line => line.match(/\[LoadIC::Load\] NOT FOUND: .+ <String\[1\]: #y>/)))
});

test.run();

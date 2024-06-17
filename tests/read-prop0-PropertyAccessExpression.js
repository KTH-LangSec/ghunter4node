const { test } = require('uvu');
const assert = require('uvu/assert');
const { cleanLogs, readOneLogFile } = require("../src/nodejs-taint-log-reader");
const { run } = require('../src/nodejs-taint-runner');

test.before.each(() => {
  cleanLogs();
});

test('PropertyAccessExpression 1', () => {
  run('({}).y');
  const log = readOneLogFile();
  assert.ok(log.some(line => line.match(/\[LoadIC::Load\] NOT FOUND: .+ <String\[1\]: #y>/)))
});

test('PropertyAccessExpression 2', () => {
  run('({y: {}}).y.z');
  const log = readOneLogFile();
  assert.ok(log.some(line => line.match(/\[LoadIC::Load\] NOT FOUND: .+ <String\[1\]: #z>/)))
});


test('PropertyAccessExpression 3', () => {
  run('({y: 42}).y');
  const log = readOneLogFile();
  assert.not(log.some(line => line.match(/\[LoadIC::Load\] NOT FOUND: .+ <String\[1\]: #y>/)))
});

test('PropertyAccessExpression 4', () => {
  run('(Object.create(null)).y');
  const log = readOneLogFile();
  assert.not(log.some(line => line.match(/\[LoadIC::Load\] NOT FOUND: .+ <String\[1\]: #y>/)))
});


test.run();

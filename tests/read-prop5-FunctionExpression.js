const { test } = require('uvu');
const assert = require('uvu/assert');
const { cleanLogs, readOneLogFile } = require("../src/nodejs-taint-log-reader");
const { run } = require('../src/nodejs-taint-runner');

test.before.each(() => {
  cleanLogs();
});

test('FunctionExpression 1', () => {
  run("(function f({y}){return})({})");
  const log = readOneLogFile();
  assert.ok(log.some(line => line.match(/\[LoadIC::Load\] NOT FOUND: .+ <String\[1\]: #y>/)))
});

test('FunctionExpression 2', () => {
  run("(function f({y}, a, {z}){return})({}, 42, {})");
  const log = readOneLogFile();
  assert.ok(log.some(line => line.match(/\[LoadIC::Load\] NOT FOUND: .+ <String\[1\]: #y>/)))
  assert.ok(log.some(line => line.match(/\[LoadIC::Load\] NOT FOUND: .+ <String\[1\]: #z>/)))
});

test('FunctionExpression 3', () => {
  run("(function f({y: z}){return})({})");
  const log = readOneLogFile();
  assert.ok(log.some(line => line.match(/\[LoadIC::Load\] NOT FOUND: .+ <String\[1\]: #y>/)))
});

test('FunctionExpression 4', () => {
  run("(function f({['y']: z}){return})({})");
  const log = readOneLogFile();
  assert.ok(log.some(line => line.match(/\[LoadIC::Load\] NOT FOUND: .+ <String\[1\]: #y>/)))
});

test.run();

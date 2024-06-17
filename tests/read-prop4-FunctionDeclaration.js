const { test } = require('uvu');
const assert = require('uvu/assert');
const { cleanLogs, readOneLogFile } = require("../src/nodejs-taint-log-reader");
const { run } = require('../src/nodejs-taint-runner');

test.before.each(() => {
  cleanLogs();
});

test('FunctionDeclaration 1', () => {
  run("function f({y}){return};f({})");
  const log = readOneLogFile();
  assert.ok(log.some(line => line.match(/\[LoadIC::Load\] NOT FOUND: .+ <String\[1\]: #y>/)))
});

test('FunctionDeclaration 2', () => {
  run("function f({y}, a, {z}){return};f({}, 42, {})");
  const log = readOneLogFile();
  assert.ok(log.some(line => line.match(/\[LoadIC::Load\] NOT FOUND: .+ <String\[1\]: #y>/)))
  assert.ok(log.some(line => line.match(/\[LoadIC::Load\] NOT FOUND: .+ <String\[1\]: #z>/)))
});

test('FunctionDeclaration 3', () => {
  run("function f({y: z}){return};f({})");
  const log = readOneLogFile();
  assert.ok(log.some(line => line.match(/\[LoadIC::Load\] NOT FOUND: .+ <String\[1\]: #y>/)))
});

test('FunctionDeclaration 4', () => {
  run("function f({['y']: z}){return};f({})");
  const log = readOneLogFile();
  assert.ok(log.some(line => line.match(/\[LoadIC::Load\] NOT FOUND: .+ <String\[1\]: #y>/)))
});

test.run();

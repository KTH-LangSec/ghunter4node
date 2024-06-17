const { test } = require('uvu');
const assert = require('uvu/assert');
const { cleanLogs, readOneLogFile } = require("../src/nodejs-taint-log-reader");
const { run } = require('../src/nodejs-taint-runner');

test.before.each(() => {
  cleanLogs();
});

test('VariableDeclaration 1', () => {
  run("const {y} = {};");
  const log = readOneLogFile();
  assert.ok(log.some(line => line.match(/\[LoadIC::Load\] NOT FOUND: .+ <String\[1\]: #y>/)))
});

test('VariableDeclaration 2', () => {
  run("const {y} = {}, {z} = {};");
  const log = readOneLogFile();
  assert.ok(log.some(line => line.match(/\[LoadIC::Load\] NOT FOUND: .+ <String\[1\]: #y>/)))
  assert.ok(log.some(line => line.match(/\[LoadIC::Load\] NOT FOUND: .+ <String\[1\]: #z>/)))
});

test('VariableDeclaration 3', () => {
  run("const {y: {z}} = {y: {}};");
  const log = readOneLogFile();
  assert.ok(log.some(line => line.match(/\[LoadIC::Load\] NOT FOUND: .+ <String\[1\]: #z>/)))
});

test('VariableDeclaration 4', () => {
  run("const {['y']: y} ={};");
  const log = readOneLogFile();
  assert.ok(log.some(line => line.match(/\[LoadIC::Load\] NOT FOUND: .+ <String\[1\]: #y>/)))
});

test('VariableDeclaration 5', () => {
  run("let z; const {y} = {z} = {};");
  const log = readOneLogFile();
  assert.ok(log.some(line => line.match(/\[LoadIC::Load\] NOT FOUND: .+ <String\[1\]: #y>/)))
  assert.ok(log.some(line => line.match(/\[LoadIC::Load\] NOT FOUND: .+ <String\[1\]: #z>/)))
});

test('VariableDeclaration 6', () => {
  run("const {y} = {y: 42};");
  const log = readOneLogFile();
  assert.not(log.some(line => line.match(/\[LoadIC::Load\] NOT FOUND: .+ <String\[1\]: #y>/)))
});

test('VariableDeclaration 7', () => {
  run("const {y} = Object.create(null);");
  const log = readOneLogFile();
  assert.not(log.some(line => line.match(/\[LoadIC::Load\] NOT FOUND: .+ <String\[1\]: #y>/)))
});


test.run();

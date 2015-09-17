/* Copyright (c) 2013 Richard Rodger, MIT License */

"use strict";

var Seneca = require('seneca');
var Lab = require('lab');
var CommonTests = require('seneca-store-test');

var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;

var tmpdir = require('osenv').tmpdir;
var dir = tmpdir() + '/test-seneca-level-store';
require('mkdirp').sync(dir);

var seneca = Seneca({ log: 'silent' });
seneca.use(require('..'), {
  folder: dir
})

var testcount = 0;
seneca.__testcount = 0;

describe('leveldb Store', function () {

  it('Common Tests', function (done) {
    testcount++;
    CommonTests.basictest(seneca, done);
  })

  it('Common Tests Completed', function (done) {
    CommonTests.closetest(seneca, testcount, done);
  })
})

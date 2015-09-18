/* Copyright (c) 2013 Richard Rodger, MIT License */

/*jslint node: true */

"use strict";

var _ = require('lodash');
var seneca = require('seneca');
var shared = require('seneca-store-test');
var fs = require('fs');

var Lab = require('lab');
var lab = exports.lab = Lab.script();

var describe = lab.describe;
var it = lab.it;

var tmpdir = require('osenv').tmpdir;
var dir = tmpdir() + '/test-seneca-level-store';
require('mkdirp').sync(dir);


var incrementConfig = _.assign({
  map: { '-/-/incremental': '*' },
  auto_increment: true
});

var si = seneca();
si.use(require('..'), {folder: dir });
si.use(require('..'), incrementConfig);

describe('Level Test', function () {

   shared.basictest({
    seneca: si,
    script: lab
  });

  // Not sure these should be supported by Level
  // shared.sorttest({
  //   seneca: si,
  //   script: lab
  // });
  //
  // shared.limitstest({
  //   seneca: si,
  //   script: lab
  // });

});

/* Copyright (c) 2013 Richard Rodger, MIT License */

/*jslint node: true */

'use strict'

var _ = require('lodash')
var Lab = require('lab')
var Mkdirp = require('mkdirp')
var OsEnv = require('osenv')
var Seneca = require('seneca')
var Shared = require('seneca-store-test')

var LevelStore = require('..')

// Shortcuts
var lab = exports.lab = Lab.script()
var describe = lab.describe
var it = lab.it
var dir = OsEnv.tmpdir() + '/test-seneca-level-store'
Mkdirp.sync(dir)

var incrementConfig = _.assign({
  map: { '-/-/incremental': '*' },
  auto_increment: true
})

var si = Seneca()
si.use(LevelStore, { folder: dir })
si.use(LevelStore, incrementConfig)

describe('Level Test', function () {
  Shared.basictest({
    seneca: si,
    script: lab
  })

  Shared.sorttest({
    seneca: si,
    script: lab
  })

  Shared.limitstest({
    seneca: si,
    script: lab
  })
})

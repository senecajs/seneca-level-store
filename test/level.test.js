/* Copyright (c) 2013 Richard Rodger, MIT License */
"use strict";

var tmpdir = require('osenv').tmpdir
var dir = tmpdir() + '/test-seneca-level-store'
require('mkdirp').sync(dir)

var assert = require('assert')


var seneca = require('seneca')



var shared = seneca.test.store.shared



var si = seneca()
si.use(require('..'),{
  folder:dir
})

si.__testcount = 0
var testcount = 0


describe('level', function(){
  it('basic', function(done){
    testcount++
    shared.basictest(si,done)
  })


  it('extra', function(done){
    testcount++
    extratest(si,done)
  })


  it('close', function(done){
    shared.closetest(si,testcount,done)
  })
})



function extratest(si,done) {
  console.log('EXTRA')
  si.__testcount++
  done()
}

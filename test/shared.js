"use strict";
var tape = require('tape')

var eyes    = require('eyes')
//var async   = require('async')
var _       = require('underscore')
var gex     = require('gex')


var tmpdir = require('osenv').tmpdir
var dir = tmpdir() + '/test-seneca-level-store'
require('mkdirp').sync(dir)

var seneca = require('seneca')

var si = seneca()
si.use(require('..'),{
  folder:dir
})

si.__testcount = 0
var testcount = 0


var bartemplate = { 
  name$:'bar', 
  base$:'moon', 
  zone$:'zen',  

  str:'aaa',
  int:11,
  dec:33.33,
  bol:false,
  wen:new Date(2020,1,1),
  arr:[2,3],
  obj:{a:1,b:[2],c:{d:3}}
}

var barverify = function(bar, assert) {
  assert.equal('aaa', bar.str)
  assert.equal(11,    bar.int)
  assert.equal(33.33, bar.dec)
  assert.equal(false, bar.bol)
  assert.equal(new Date(2020,1,1).toISOString(), _.isDate(bar.wen) ? bar.wen.toISOString() : bar.wen )

  assert.equal(''+[2,3],''+bar.arr)
  assert.equal(JSON.stringify({a:1,b:[2],c:{d:3}}),JSON.stringify(bar.obj))
}



var scratch = {}

var verify = exports.verify = function(cb,tests){
  return function(error,out) {
    if( error ) return cb(error);
    tests(out)
    cb()
  }
}


function noop() {}

var i = 0
module.exports = function (si) {
  var k = i ++, isDone

  tape('setup', function(assert) {

    //console.log(assert.__proto__)
    assert.__proto__.isNotNull = assert.__proto__.ok


  si.ready(function(){
    console.log('BASIC', k)
    assert.ok(si)

    // TODO: test load$(string), remove$(string)
    assert.end()
    })
  })

  tape('save1', function(assert) {
    var foo1 = si.make({name$:'foo'}) ///si.make('foo')
    foo1.p1 = 'v1'
    
    console.log("SAVE1", k)
    foo1.save$( verify(noop, function(foo1){
      assert.isNotNull(foo1.id)
      assert.equal('v1',foo1.p1)
      scratch.foo1 = foo1
      assert.end()
    }))
  })

  tape('load1', function(assert) {
    console.log("LOAD1", k)
    scratch.foo1.load$( scratch.foo1.id, verify(noop,function(foo1){
      assert.isNotNull(foo1.id)
      assert.equal('v1',foo1.p1)
      scratch.foo1 = foo1
      assert.end()
    }))
  })

  tape('save2', function(assert) {
    console.log("SAVE2", k)
    scratch.foo1.p1 = 'v1x'
    scratch.foo1.p2 = 'v2'
    scratch.foo1.save$(verify(noop, function(foo1){
      assert.isNotNull(foo1.id)
      assert.equal('v1x',foo1.p1)
      assert.equal('v2',foo1.p2)
      scratch.foo1 = foo1
      assert.end()
    })) 
  })
  
  tape('load2', function(assert) {
    console.log("LOAD2", k)
    scratch.foo1.load$( scratch.foo1.id, verify(noop, function(foo1){
      assert.isNotNull(foo1.id)
      assert.equal('v1x',foo1.p1)
      assert.equal('v2',foo1.p2)
      scratch.foo1 = foo1
      assert.end()
    }))
  })

  tape('save3', function(assert) {
    console.log(assert)
    console.log("SAVE3", k)
    scratch.bar = si.make( bartemplate )
    var mark = scratch.bar.mark = Math.random()

    scratch.bar.save$( verify(noop, function(bar){
      assert.isNotNull(bar.id)
      barverify(bar, assert)
      assert.equal( mark, bar.mark )
      scratch.bar = bar
      assert.end()
    }))
  })

  tape('save4', function(assert) {
    console.log("SAVE4", k)
    scratch.foo2 = si.make({name$:'foo'})
    scratch.foo2.p2 = 'v2'
    
    scratch.foo2.save$( verify(noop, function(foo2){
      assert.isNotNull(foo2.id)
      assert.equal('v2',foo2.p2)
      scratch.foo2 = foo2
      assert.end()
    }))
  })

  tape('query1', function(assert) {
    console.log("QUERY1", k)
    scratch.barq = si.make('zen', 'moon','bar')
    scratch.barq.list$({}, verify(noop, function(res){
      assert.ok( 1 <= res.length)
      barverify(res[0], assert)
      assert.end()
    }))
  })

  tape('query2', function(assert) {
    console.log("QUERY2", k)
    scratch.foo1.list$({}, verify(noop, function(res){
      assert.ok( 2 <= res.length)
      assert.end()
    }))
  })

  tape('query3', function(assert) {
    console.log("QUERY3", k)
    scratch.barq.list$({id:scratch.bar.id}, verify(noop, function(res){
      assert.equal( 1, res.length )
      barverify(res[0], assert)
      assert.end()
    }))
  })

  tape('query4', function(assert) {
    console.log("QUERY4", k)
    scratch.bar.list$({mark:scratch.bar.mark}, verify(noop, function(res){
      assert.equal( 1, res.length )
      barverify(res[0], assert)
      assert.end()
    }))
  })

  tape('query5', function(assert) {
    console.log("QUERY5", k)

    scratch.foo1.list$({p2:'v2'}, verify(noop, function(res){
      assert.ok( 2 <= res.length )
      assert.end()
    }))
  })


  tape('query6', function(assert) {
    console.log("QUERY6", k)
    scratch.foo1.list$({p2:'v2',p1:'v1x'}, verify(noop, function(res){
      assert.ok( 1 <= res.length )
      res.forEach(function(foo){
        assert.equal('v2',foo.p2)
        assert.equal('v1x',foo.p1)
        assert.end()
      })
    }))
  })

  tape('remove1', function(assert) {
    console.log("REMOVE1", k)
    var foo = si.make({name$:'foo'})
    
    foo.remove$( {all$:true}, function(err, res){
      assert.notOk(err)

      foo.list$({},verify(noop, function(res){
        assert.equal(0,res.length)
        assert.end()
      }))
    })
  })

  tape('remove2', function(assert) {
    console.log("REMOVE2", k)
    scratch.bar.remove$({mark:scratch.bar.mark}, function(err,res){
      assert.notOk(err)
      scratch.bar.list$({mark:scratch.bar.mark}, verify(noop, function(res){
        assert.equal( 0, res.length )
        assert.end()
      }))
    })
  })

}

module.exports(si)

//exports.sqltest = function(si,done) {
//  si.ready(function(){
//    assert.isNotNull(si)
//
//    var Product = si.make('product')
//    var products = []
//
//    async.series(
//      {
//        setup: function(cb) {
//
//          products.push( Product.make$({name:'apple',price:100}) )
//          products.push( Product.make$({name:'pear',price:200}) )
//
//          var i = 0
//          function saveproduct(){
//            return function(cb) {
//              products[i].save$(cb)
//              i++
//            }
//          }
//
//          async.series([
//            saveproduct(),
//            saveproduct(),
//          ],cb)
//        },
//
//
//        query_string: function( cb ) {
//          Product.list$("SELECT * FROM product ORDER BY price",function(err,list){
//            var s = _.map(list,function(p){return p.toString()}).toString()
//            assert.ok( 
//              gex("//product:{id=*;name=apple;price=100},//product:{id=*;name=pear;price=200}").on( s ) )
//            cb()
//          })
//        },
//
//        query_params: function( cb ) {
//          Product.list$(["SELECT * FROM product WHERE price >= ? AND price <= ?",0,1000],function(err,list){
//            var s = _.map(list,function(p){return p.toString()}).toString()
//            assert.ok( 
//              gex("//product:{id=*;name=apple;price=100},//product:{id=*;name=pear;price=200}").on( s ) )
//            cb()
//          })
//        },
//
//        teardown: function(cb) {
//          products.forEach(function(p){
//            p.remove$()
//          })
//          cb()
//        }
//      },
//      function(err,out){
//        if( err ) {
//          eyes.inspect( err )
//        }
//        si.__testcount++
//        assert.isNull(err)
//        done && done()
//      }
//    )
//  })
//}


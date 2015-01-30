/* Copyright (c) 2013-2015 Richard Rodger, MIT License */
/* jslint node:true, asi:true */
"use strict";


var fs      = require('fs')
var path    = require('path')

var _       = require('lodash')
var uuid    = require('node-uuid')
var levelup = require('levelup')

var name    = "level-store"


var levelQuery      = require('level-queryengine')
var jsonqueryEngine = require('jsonquery-engine')


module.exports = function(opts) {
  var desc, dbmap = {}, seneca = this

  opts = this.util.deepextend({
    folder: '.',
    encoding: 'json',
    sync: false,
    fillCache: true
  }, opts)


  function fixquery(qent, q) {
    return null==q ? {} : _.isString(q) ? {id: q} : _.isString(q.id) ? q : q
  }

  function metaquery(qent,q) {
    var mq = {}

    if( !q.native$ ) {

      if( q.limit$ && !q.skip$) {
        mq.limit = q.limit$
      }

    }
    else {
      mq = q.native$
    }

    return mq
  }


  function filterdata(q, data) {

    for(var p in q) {
      if( !~p.indexOf('$') && q[p] != data[p] ) {
        return null
      }
    }

    if( q.fields$ ) {
      data = _.omit(data, q.field$)
    }

    return data
  }


  function fixlist(q, list) {

    // sort first
    if( q.sort$ ) {
      for( var sf in q.sort$ ) break;
      var sd = q.sort$[sf] < 0 ? -1 : 1
      
      list = list.sort(function(a, b){
        return sd * ( a[sf] < b[sf] ? -1 : a[sf] === b[sf] ? 0 : 1 )
      })
    }


    if( q.skip$ ) {
      list = list.slice(q.skip$)
    }

    if( q.limit$ ) {
      list = list.slice(0, q.limit$)
    }

    return list
  }



  function ensurefolder(folder, cb){
    fs.exists(folder, function(exists){
      if( exists ) return cb();
      
      fs.mkdir(folder, function(err){
        cb(err)
      })
    })
  }

  function makefolderpath(ent) {
    var canon = ent.canon$({object: true})
    var base  = canon.base
    var name  = canon.name
    
    var entfolder = (base ? base + '_' : '') + name
    var folderpath = path.join(opts.folder, entfolder)
    
    return folderpath
  }


  function error(done, win){
    return function(err, out){
      if( err ) return done(err);
      if (win) win(out)
    }
  }


  var get_db = once(function get_db(ent, done) {
    var folder = makefolderpath(ent)
    var db = dbmap[folder]
    
    if( !db ) {
      ensurefolder(folder, error(done, function(){
        if( db = dbmap[folder] ) return done(null,db);

        try {
          var n = 0
          db = dbmap[folder] = levelQuery(levelup(folder, opts))
          db.query.use(jsonqueryEngine());

          // index all the properties in pairs
          db.ensureIndex('*', 'pairs', pairs.index);

        }
        catch(e) {
          if( db = dbmap[folder] )
            return done(null, db);
          return done(e);
        }
        return done(null, db)
      }))
    }
    else return done(null, db);
  })



  function once (fun) {
    return fun;
  }



  var store = {
    name:name,

    close: once(function(done) {
      seneca.util.recurse(_.values(dbmap), function(db, next){        
        db.close(next)
      },done)
    }),

    
    save: once(function(args, done) {
      var ent = args.ent

      var update = !!ent.id

      if( !update ) {
        ent.id = void 0 != ent.id$ ? ent.id$ : uuid();
        delete(ent.id$)
      }

      once(get_db)(ent, error(done, function(db){
        db.put( ent.id, ent.data$(false), {sync:opts.sync}, error(done, function(){
          seneca.log.debug('save/'+(update? 'update' : 'insert'), ent, desc)
          done(null, ent)
        }))
      }))
    }),


    load: once(function(args, done) {
      var qent = args.qent
      var q    = args.q

      var qq = fixquery(qent, q)

      if( qq.id ) {
        get_db(qent, error(done, function(db){
          db.get( qq.id, {fillCache:opts.fillCache}, function(err, data){
            if( err ) {
              if( 'NotFoundError' == err.name ) return done(null, null);
              return done(err);
            }
            var fent = qent.make$(data)
            seneca.log.debug('load', q, fent, desc)
            done(null, fent)
          })
        }))
      }
      else {
        store.list(args, error(done, function(list){
          done(null, list[0])
        }))
      }
    }),


    remove: once(function(args, done) {
      var qent = args.qent
      var q    = args.q
      
      // all that match the query, of course
      var all  = q.all$ // default false

      var load  = _.isUndefined(q.load$) ? true : q.load$ // default true 

      var qq = fixquery(qent,q)

      get_db(qent, error(done, function(db){
        if( !_.isUndefined(qq.id) && load && !all ) {
          db.get( qq.id, {fillCache:opts.fillCache}, function(err, data){
            if( err ) {
              if( 'NotFoundError' == err.name ) return done(null, null);
              return done(err);
            }
            var fent = qent.make$(data)
            do_remove(db, fent)
          })
        }
        else do_remove(db)
      }))

      function do_remove(db, maybefent) {
        if( _.isUndefined(qq.id) ) {
          if( all ) {
            store.list(args, error(done, function(list){
              seneca.util.recurse(
                list,
                function(fent, next){
                  db.del(fent.id, {sync:opts.sync}, next)
                },
                function(err){
                  seneca.log.debug('remove/all', q, desc)
                  done(err)
                }
              )
            }))
          }
          else {
            store.load(args, error(done, function(item){
              if( item ) {
                db.del( item.id, {sync:opts.sync}, function(err){
                  if( err ) return done(err);
                  seneca.log.debug('remove/one', q, item, desc)
                  done(null,item)
                })
              }
              else return done();
            }))
          }
        }
        else {
          db.del(qq.id, {sync:opts.sync}, function(err){
            if( err ) return done(err)
            seneca.log.debug('remove/one', q, maybefent, desc)
            done(null, maybefent)
          })
        }
      }
    }),


    list: once(function(args, done) {
      var qent = args.qent
      var q    = args.q


      get_db(qent, error(done, function(db){

        var mq = metaquery(qent, q)

        var n = 1

        var list = []

        if(q.all$)
          q = {}
        db.query(q)
          .on('data', function (data) {

            if( filterdata( q, data ) ) { 
              list.push( qent.make$(data) )
            }

          })
          .on('error', function (err) {
            if(--n) throw new Error('errored:'+ n)
            done(err)
          })
          .on('close', function () {
            // do nothing, I guess
          })
          .on('end', function () {
            if(--n) throw new Error('ended:'+ n)

            list = fixlist(q,list)

            seneca.log.debug('list',q,list.length,list[0],desc)
            done(null,list)
          })        
      }))
    }),



    native: once(function(args,done) {
      get_db(args.ent, function(err, db) {
        done(err, db);
      });
    })
  }


  var storedesc = seneca.store.init(seneca,opts,store)

  return {name:store.name,tag:storedesc.tag}
}


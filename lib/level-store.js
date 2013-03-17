/* Copyright (c) 2013 Richard Rodger, MIT License */
"use strict";


var fs      = require('fs')
var path     = require('path')

var _       = require('underscore')
var uuid    = require('node-uuid')
var levelup = require('levelup')


var name = "level-store"





module.exports = function(opts,register) {
  var desc, dbmap = {}, seneca = this


  opts = this.util.deepextend({
    folder:'.',
    encoding:'json',
    sync:false,
    fillCache:true
  },opts)




  function fixquery(qent,q) {

    return _.isString(q) ? {id:q} : _.isString(q.id) ? q : {}
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


  function filterdata(q,data) {

    for(var p in q) {
      if( !~p.indexOf('$') && q[p] != data[p] ) {
        return null
      }
    }

    if( q.fields$ ) {
      data = _.omit(data,q.field$)
    }


    return data
  }


  function fixlist(q,list) {

    // sort first
    if( q.sort$ ) {
      for( var sf in q.sort$ ) break;
      var sd = q.sort$[sf] < 0 ? -1 : 1
      
      list = list.sort(function(a,b){
        return sd * ( a[sf] < b[sf] ? -1 : a[sf] === b[sf] ? 0 : 1 )
      })
    }


    if( q.skip$ ) {
      list = list.slice(q.skip$)
    }

    if( q.limit$ ) {
      list = list.slice(0,q.limit$)
    }

    return list
  }



  function ensurefolder(folder,cb){
    fs.exists(folder,function(exists){
      if( exists ) return cb();
      
      fs.mkdir(folder,function(err){
        cb(err)
      })
    })
  }

  function makefolderpath(ent) {
    var canon = ent.canon$({object:true})
    var base   = canon.base
    var name   = canon.name
    
    var entfolder = (base?base+'_':'')+name
    var folderpath = path.join( opts.folder, entfolder )
    
    return folderpath
  }


  function error(done,win){
    return function(err,out){
      if( err ) return done(err);
      win && win(out)
    }
  }


  function get_db(ent,done) {
    var folder = makefolderpath(ent)
    var db = dbmap[folder]
    
    if( !db ) {
      ensurefolder(folder,error(done,function(){
        db = dbmap[folder] = levelup(folder,opts,done)
      }))
    }
    else return done(null,db);
  }



  var store = {
    name:name,

    close: function(done) {
      seneca.util.recurse(_.values(dbmap),function(db,next){
        
        db.close(next)
      },done)
    },

    
    save: function(args,done) {
      var ent = args.ent    

      var update = !!ent.id

      if( !update ) {
        ent.id = void 0 != ent.id$ ? entd.id$ : uuid()
        delete ent.id$
      }

      get_db(ent,error(done,function(db){
        db.put( ent.id, ent.data$(false), {sync:opts.sync}, error(done,function(){
          seneca.log.debug('save/'+(update?'update':'insert'),ent,desc)
          done(null,ent)
        }))
      }))
    },


    load: function(args,done) {
      var qent = args.qent
      var q    = args.q

      var qq = fixquery(qent,q)

      if( qq.id ) {
        get_db(qent,error(done,function(db){
          db.get( qq.id, {fillCache:opts.fillCache}, error(done, function(data){
            var fent = qent.make$(data)
            seneca.log.debug('load',q,fent,desc)
            done(null,fent)
          }))
        }))
      }
      else {
        store.list(args,error(done,function(list){
          done(null,list[0])
        }))
      }
    },


    remove: function(args,done) {
      var qent = args.qent
      var q    = args.q
      
      // all that match the query, of course
      var all  = q.all$ // default false

      var load  = _.isUndefined(q.load$) ? true : q.load$ // default true 

      var qq = fixquery(qent,q)

      get_db(qent,error(done,function(db){
        if( !_.isUndefined(qq.id) && load && !all ) {
          db.get( qq.id, {fillCache:opts.fillCache}, error(done, function(data){
            var fent = qent.make$(data)
            do_remove(db,fent)
          }))
        }
        else do_remove(db)
      }))

      function do_remove(db,maybefent) {
        if( all || _.isUndefined(qq.id) ) {
          store.list(args,error(done,function(list){
            seneca.util.recurse(
              list,
              function(fent,next){
                db.del(fent.id,{sync:opts.sync},next)
              },
              function(err){
                seneca.log.debug('remove/all',q,desc)
                done(err)
              }
            )
          }))

        }
        else {
          db.del(qq.id,{sync:opts.sync},function(err){
            if( err ) return done(err)
            seneca.log.debug('remove/one',q,maybefent,desc)
            done(null,maybefent)
          })
        }
      }
    },


    list: function(args,done) {
      var qent = args.qent
      var q    = args.q


      get_db(qent,error(done,function(db){

        var mq = metaquery(qent,q)

        var list = []
        db.createValueStream(mq)
          .on('data', function (data) {

            if( filterdata( q, data ) ) { 
              list.push( qent.make$(data) )
            }

          })
          .on('error', function (err) {
            done(err)
          })
          .on('close', function () {
            // do nothing, I guess
          })
          .on('end', function () {

            list = fixlist(q,list)

            seneca.log.debug('list',q,list.length,list[0],desc)
            done(null,list)
          })        
      }))
    },



    native: function(args,done) {
      done(null,db)
    }
  }



  seneca.store.init(seneca,opts,store,function(err,tag,description){
    if( err ) return register(err);

    desc = description

    register(null,{name:store.name,tag:tag})
  })
}


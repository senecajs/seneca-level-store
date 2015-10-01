/* Copyright (c) 2013-2015 Richard Rodger, MIT License */
/* jslint node:true, asi:true */
'use strict'

var Fs = require('fs')
var Path = require('path')
var _ = require('lodash')
var Uuid = require('node-uuid')
var Levelup = require('level')
var LevelQuery = require('level-queryengine')
var JsonqueryEngine = require('jsonquery-engine')

// Declare internals
var internals = {
  name: 'level-store'
}

module.exports = function (opts) {
  var seneca = this
  var desc
  var dbmap = {}

  opts = seneca.util.deepextend({
    folder: '.',
    valueEncoding: 'json',
    sync: false,
    fillCache: true
  }, opts)

  /**
   * Get the levelup reference
   */
  var get_db = function get_db (ent, done) {
    var folder = internals.makefolderpath(opts.folder, ent)
    var db = dbmap[folder]
    if (db) {
      return done(null, db)
    }
    internals.ensurefolder(folder, internals.error(done, function () {
      db = dbmap[folder]
      if (db) {
        return done(null, db)
      }
      try {
        db = dbmap[folder] = LevelQuery(Levelup(folder, opts))
        db.query.use(JsonqueryEngine())
      } catch (e) {
        db = dbmap[folder]
        if (db) {
          return done(null, db)
        }
        return done(e)
      }
      return done(null, db)
    }))
  }

  var store = {
    name: internals.name,

    close: function (args, done) {
      // Closes all the dbs
      seneca.util.recurse(_.values(dbmap), function (db, next) {
        db.close(next)
      }, done)
    },

    save: function (args, done) {
      var ent = args.ent
      var update = !!ent.id

      if (!update) {
        ent.id = (ent.id$ !== void 0) ? ent.id$ : Uuid()
        delete (ent.id$)
      }

      get_db(ent, internals.error(done, function (db) {
        db.put(ent.id, ent.data$(false), function (err) {
          if (err) {
            return done(err)
          }

          seneca.log.debug('save/' + (update ? 'update' : 'insert'), ent, desc)
          done(null, ent)
        })
      }))
    },

    load: function (args, done) {
      var qent = args.qent
      var q = args.q
      var qq = internals.fixquery(qent, q)

      if (!qq.id) {
        return store.list(args, internals.error(done, function (list) {
          done(null, list[0])
        }))
      }

      get_db(qent, internals.error(done, function (db) {
        db.get(qq.id, function (err, data) {
          if (err) {
            return err.notFound ? done(null, null) : done(err)
          }

          var fent = qent.make$(data)
          seneca.log.debug('load', q, fent, desc)
          done(null, fent)
        })
      }))
    },

    remove: function (args, done) {
      var qent = args.qent
      var q = args.q

      // all that match the query, of course
      var all = q.all$ // default false
      var load = _.isUndefined(q.load$) ? true : q.load$ // default true
      var qq = internals.fixquery(qent, q)

      get_db(qent, internals.error(done, function (db) {
        if (!_.isUndefined(qq.id) && load && !all) {
          return db.get(qq.id, { fillCache: opts.fillCache }, function (err, data) {
            if (err) {
              return err.notFound ? done(null, null) : done(err)
            }

            var fent = qent.make$(data)
            seneca.log.debug('remove', q, fent, desc)
            do_remove(db, fent)
          })
        }

        do_remove(db)
      }))

      function do_remove (db, maybefent) {
        if (!_.isUndefined(qq.id)) {
          return db.del(qq.id, {sync: opts.sync}, function (err) {
            if (err) {
              return done(err)
            }
            seneca.log.debug('remove/one', q, maybefent, desc)
            done(null, maybefent)
          })
        }
        if (all) {
          store.list(args, internals.error(done, function (list) {
            seneca.util.recurse(
              list,
              function (fent, next) {
                db.del(fent.id, { sync: opts.sync }, next)
              },
              function (err) {
                seneca.log.debug('remove/all', q, desc)
                done(err)
              }
            )
          }))
        } else {
          store.load(args, internals.error(done, function (item) {
            if (!item) {
              return done()
            }
            db.del(item.id, { sync: opts.sync }, function (err) {
              if (err) {
                return done(err)
              }
              seneca.log.debug('remove/one', q, item, desc)
              done(null, item)
            })
          }))
        }
      }
    },

    list: function (args, done) {
      var qent = args.qent
      var q = args.q

      get_db(qent, internals.error(done, function (db) {
        // var mq = metaquery(qent, q)
        var n = 1
        var list = []

        // saves the sorting / limit / skip / fields params
        var additionaParams = {
          sort$: q.sort$,
          limit$: q.limit$,
          skip$: q.skip$,
          fields$: q.fields$
        }
        // Remove the optional params from the query
        q = _.omit(q, ['sort$', 'limit$', 'skip$', 'fields$'])
        if (q.all$) { // useless
          q = {}
        }

        db.query(q)
          .on('data', function (data) {
            if (internals.filterdata(q, data)) {
              list.push(qent.make$(data))
            }
          })
          .on('error', function (err) {
            if (--n) {
              throw new Error('errored:' + n)
            }
            done(err)
          })
          .on('close', function () {})
          .on('end', function () {
            if (--n) {
              throw new Error('ended:' + n)
            }
            // Order / skip / fields mngmt
            list = internals.fixlist(additionaParams, list)
            seneca.log.debug('list', q, list.length, list[0], desc)
            done(null, list)
          })
      }))
    },

    native: function (args, done) {
      get_db(args.ent, function (err, db) {
        done(err, db)
      })
    }
  }

  var storedesc = seneca.store.init(seneca, opts, store)

  return { name: store.name, tag: storedesc.tag }
}

internals.fixquery = function (qent, q) {
  return q === null ? {} : _.isString(q) ? {id: q} : _.isString(q.id) ? q : q
}

internals.filterdata = function (q, data) {
  for (var p in q) {
    if (!~p.indexOf('$') && q[p] !== data[p]) {
      return null
    }
  }
  if (q.fields$) {
    data = _.omit(data, q.field$)
  }
  return data
}

/**
 * sort$, skip$, limit$ and fields$ support.
 */
internals.fixlist = function (q, list) {
  // sort first
  if (q.sort$) {
    for (var sf in q.sort$) break
    var sd = q.sort$[sf] < 0 ? -1 : 1

    list = _.sortBy(list, sf)
    if (sd === -1) {
      list.reverse()
    }
  }
  if (q.skip$) {
    list = list.slice(q.skip$)
  }

  if (q.limit$) {
    list = list.slice(0, q.limit$)
  }

  if (q.fields$) {
    list = _.map(list, function (item) {
      return _.pick(item, q.fields$)
    })
  }

  return list
}

/**
 * Return if the folder exists, create otherwise.
 */
internals.ensurefolder = function (folder, cb) {
  Fs.stat(folder, function (err, stat) {
    if (!err && stat.isDirectory()) {
      return cb()
    }
    Fs.mkdir(folder, function (err) {
      if (err && err.code === 'EEXIST') {
        err = null
      }
      cb(err)
    })
  })
}

internals.makefolderpath = function (folder, ent) {
  var canon = ent.canon$({object: true})

  var base = canon.base
  var name = canon.name

  var entfolder = (base ? base + '_' : '') + name
  var folderpath = Path.join(folder, entfolder)
  return folderpath
}

internals.error = function (done, win) {
  return function (err, out) {
    if (err) {
      return done(err)
    }
    if (win) {
      return win(out)
    }
  }
}

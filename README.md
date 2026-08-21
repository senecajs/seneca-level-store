![Seneca](http://senecajs.org/files/assets/seneca-logo.png)
> A [Seneca.js](http://senecajs.org) plugin

# seneca-level-store

[![npm version](https://img.shields.io/npm/v/seneca-level-store.svg)](https://npmjs.com/package/seneca-level-store)
[![build](https://github.com/senecajs/seneca-level-store/actions/workflows/build.yml/badge.svg)](https://github.com/senecajs/seneca-level-store/actions/workflows/build.yml)
[![Known Vulnerabilities](https://snyk.io/test/github/senecajs/seneca-level-store/badge.svg)](https://snyk.io/test/github/senecajs/seneca-level-store)

| ![Voxgig](https://www.voxgig.com/res/img/vgt01r.png) | This open source module is sponsored and supported by [Voxgig](https://www.voxgig.com). |
|---|---|

A [Seneca.js](http://senecajs.org) entity store using [LevelDB](http://leveldb.org/).

## Install

```sh
npm install seneca
npm install seneca-level-store
```

## Quick Example

```js
var seneca = require('seneca')()
seneca.use('basic')
.use('entity')
.use('level-store', {
  folder: 'db'
})

seneca.ready(function() {
  var apple = seneca.make$('fruit')
  apple.name = 'Pink Lady'
  apple.price = 0.99
  apple.save$(function (err, apple) {
    console.log("apple.id = " + apple.id)
  })
})
```

To run tests with Docker:

```sh
docker build -t level-store --no-cache .
docker run -i level-store
```

## More Examples

See [test/](test/) for more usage examples.

## Motivation

A storage engine that uses [LevelDB](http://leveldb.org/) to persist data. It can also be used as an example of how to implement a Seneca storage plugin using an underlying key-value store.

## Support

If you're using this module and need help, you can:

- Post a [github issue](https://github.com/senecajs/seneca-level-store/issues)
- Tweet to [@senecajs](http://twitter.com/senecajs)
- Ask on the [Gitter](https://gitter.im/senecajs/seneca)

## API

You don't use this module directly. It provides an underlying data storage engine for the Seneca entity API:

```js
var entity = seneca.make$('typename')
entity.someproperty = "something"
entity.anotherproperty = 100

entity.save$(function (err, entity) { ... })
entity.load$({id: ... }, function (err, entity) { ... })
entity.list$({property: ... }, function (err, entity) { ... })
entity.remove$({id: ... }, function (err, entity) { ... })
```

### Query Support

- `.list$({f1:v1, f2:v2, ...})` implies pseudo-query `f1==v1 AND f2==v2, ...`.
- `.list$({f1:v1,...}, {sort$:{field1:1}})` means sort by f1, ascending.
- `.list$({f1:v1,...}, {sort$:{field1:-1}})` means sort by f1, descending.
- `.list$({f1:v1,...}, {limit$:10})` means only return 10 results.
- `.list$({f1:v1,...}, {skip$:5})` means skip the first 5.
- `.list$({f1:v1,...}, {fields$:['fd1','f2']})` means only return the listed fields.

### Native Driver

Access the native driver using `entity.native$(function (err, db) {})`.

## Contributing

The [Senecajs org](https://github.com/senecajs/) encourages open participation. If you feel you can help in any way, be it with documentation, examples, extra testing, or new features please get in touch.

## Background

This plugin uses the [LevelDB](http://leveldb.org/) storage engine. Supports Seneca versions **1.x**, **2.x** and **3.x**.

All Seneca data store supported functionality is implemented in [seneca-store-test](https://github.com/senecajs/seneca-store-test) as a test suite. The tests represent the store functionality specifications.

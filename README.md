# seneca-level-store - a [Seneca](http://senecajs.org) plugin


### Seneca leveldb entity store plugin.

A storage engine that uses [leveldb](http://leveldb.org/) to persist
data. It may also be used as an example on how to implement a storage
plugin for Seneca using an underlying key-value store.


### Support

Current Version: 0.2.3

Tested on: [Seneca](//github.com/rjrodger/seneca) 0.6.5

[![Build Status](https://travis-ci.org/rjrodger/seneca-level-store.png?branch=master)](https://travis-ci.org/rjrodger/seneca-level-store)

If you're using this module, and need help, you can:

   * Post a [github issue](//github.com/rjrodger/seneca-level-store/issues),
   * Tweet to [@senecajs](http://twitter.com/senecajs),
   * Ask on the [![Gitter chat](https://badges.gitter.im/rjrodger/seneca-level-store.png)](https://gitter.im/rjrodger/seneca-level-store).



## Install
To install, simply use npm. Remember you will need to install [Seneca.js][]
seperately.

```
npm install seneca
npm install seneca-level-store
```

## Test
To run tests, simply use npm:

```
npm run test
```

## Quick Example

``` js
var seneca = require('seneca')()
seneca.use('level-store', {
  folder: 'db'
})

seneca.ready(function(){
  var apple = seneca.make$('fruit')
  apple.name  = 'Pink Lady'
  apple.price = 0.99
  apple.save$(function (err,apple) {
    console.log( "apple.id = " + apple.id  )
  })
})
```

## Usage
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
The standard Seneca query format is supported:

- `.list$({f1:v1, f2:v2, ...})` implies pseudo-query `f1==v1 AND f2==v2, ...`.

- `.list$({f1:v1,...}, {sort$:{field1:1}})` means sort by f1, ascending.

- `.list$({f1:v1,...}, {sort$:{field1:-1}})` means sort by f1, descending.

- `.list$({f1:v1,...}, {limit$:10})` means only return 10 results.

- `.list$({f1:v1,...}, {skip$:5})` means skip the first 5.

- `.list$({f1:v1,...}, {fields$:['fd1','f2']})` means only return the listed fields.

Note: you can use `sort$`, `limit$`, `skip$` and `fields$` together.

### Native Driver
As with all seneca stores, you can access the native driver, in this case, the `levelup` `db`
object using `entity.native$(function (err, db) {...})`.

## Contributing
We encourage participation. If you feel you can help in any way, be it with
examples, extra testing, or new features please get in touch.

## License
Copyright Richard Rodger 2015, Licensed under [MIT][].

[travis-badge]: https://img.shields.io/travis/rjrodger/seneca-level-store.svg?style=flat-square
[travis-url]: https://travis-ci.org/rjrodger/seneca-level-store
[npm-badge]: https://img.shields.io/npm/v/seneca-level-store.svg?style=flat-square
[npm-url]: https://npmjs.org/package/seneca-level-store

[MIT]: ./LICENSE
[Seneca.js]: https://www.npmjs.com/package/seneca
[node-leveldb-native]: http://leveldb.github.com/node-leveldb-native/markdown-docs/queries.html

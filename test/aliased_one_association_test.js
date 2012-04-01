var Seq         = require(__dirname + '/..'),
    jaz         = require('jaz-toolkit'),
    mysql       = require('mysql'),
    TEST_CONFIG = require(__dirname + '/test_config'),
    client      = mysql.createClient(TEST_CONFIG);

var generateTestData = function(db, thingsDef, itemsDef, cb) {
  db.createTable('things', thingsDef, function() {
    db.createTable('items', itemsDef, function() {
      var valuesThings = [],
          valuesItems = [],
          things = [],
          items  = [];
      valuesThings.push('(?,?)');
      valuesThings.push('(?,?)');
      valuesThings.push('(?,?)');
      things.push([ 1, 'Door' ]);
      things.push([ 2, 'Bell' ]);
      things.push([ 3, 'Air' ]);
      valuesItems.push('(?,?,?)');
      valuesItems.push('(?,?,?)');
      valuesItems.push('(?,?,?)');
      items.push([ 1, 'Bicycle', 0 ]);
      items.push([ 2, 'Balloon', 0 ]);
      items.push([ 3, 'House', 1 ]);

      client.query("INSERT INTO things (`id`, `name`) VALUES " + valuesThings.join(','), jaz.Array.flatten(things), function(err) {
        if (err) throw err;
        client.query("INSERT INTO items (`id`, `name`, `thingy_id`) VALUES " + valuesItems.join(','), jaz.Array.flatten(items), function(err) {
          if (err) throw err;
          cb();
        });
      });
    });
  });
};
var setup = function(type) {
  return function(cb) {
    var db  = Seq.createIfNotExistent(TEST_CONFIG);
    this.db = db;
    client.query("DROP TABLE things, items;", function() {
      var thingsDef = function(table) {
            table.addColumn('name', Seq.dataTypes.VARCHAR());
          },
          itemsDef = function(table) {
            table.addColumn('name', Seq.dataTypes.VARCHAR());
            table.addBelongsToColumn('thing', { as: 'thingy' });
          };

      Seq.clearTableDefinitions();
      Seq.createTable('things', thingsDef);
      Seq.createTable('items', itemsDef);
      if (type === 'object') {
        var Thing = Seq.defineModel('Thing', Seq.getTableFromMigration('things'));
        var Item  = Seq.defineModel('Item', Seq.getTableFromMigration('items'));
        Item.belongsTo(Thing, { name: 'Thingy' });
        Thing.hasOne(Item, { name: 'Mytem', selfName: 'Thingy' });
      } else if (type === 'late defined') {
        Seq.removeModel('Thing');
        var Item  = Seq.defineModel('Item', Seq.getTableFromMigration('items'));
        Item.belongsTo('Thing', { name: 'Thingy' });
        // and def
        var Thing = Seq.defineModel('Thing', Seq.getTableFromMigration('things'));
        Thing.hasOne('Item', { name: 'Mytem', selfName: 'Thingy' });
      }

      generateTestData(db, thingsDef, itemsDef, cb);
    });
  };
};

var modelTests = {
  tearDown: function(cb) {
    Seq.removeAllListeners('model_defined');
    cb();
  },
  'test adding id of thing to item': function(test) {
    var Item = Seq.getModel('Item');

    Item.find(2, function(err, item) {
      if (err) throw err;

      item.thingyId = 3;
      test.equal(item.isDirty, true);
      item.save(function(err) {
        client.query("SELECT * FROM items WHERE id=2", function(err, results) {
          if (err) throw err;

          test.equal(results[0].name, 'Balloon');
          test.equal(results[0].thingy_id, 3);
          test.done();
        });
      });
    });
  },
  'test adding thing to item': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing');

    Thing.find(3, function(err, thing) {
      if (err) throw err;

      Item.find(2, function(err, item) {
        if (err) throw err;
        item.thingy = thing;
        test.equal(item.isDirty, true);

        item.save(function(err) {
          if (err) throw err;
          client.query("SELECT * FROM items WHERE id=2", function(err, results) {
            if (err) throw err;

            test.equal(results[0].name, 'Balloon');
            test.equal(results[0].thingy_id, 3);
            test.done();
          });
        });
      });
    });
  },
  'test adding a thing to item with setThing method': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing');
    Thing.find(3, function(err, thing) {
      if (err) throw err;

      Item.find(2, function(err, item) {
        if (err) throw err;
        item.setThingy(thing);
        test.equal(item.isDirty, true);
        test.equal(item.thingyId, 3);

        item.save(function(err) {
          if (err) throw err;

          client.query("SELECT * FROM items WHERE id=2", function(err, results) {
            if (err) throw err;
            test.equal(results[0].name, 'Balloon');
            test.equal(results[0].thingy_id, 3);

            test.done();
          });
        });
      });
    });
  },
  'test adding a thing that is not saved to item with setThing method': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing'),
        thing = Thing.create({ name: 'newThing' });

    Item.find(2, function(err, item) {
      if (err) throw err;
      item.setThingy(thing);
      test.equal(item.isDirty, true);

      item.save(function(err) {
        test.equal(err.constructor, Seq.errors.AssociationsNotSavedError);
        test.equal(item.isDirty, true);

        client.query("SELECT * FROM items WHERE id=2", function(err, results) {
          if (err) throw err;
          test.equal(results[0].name, 'Balloon');
          test.ok(!results[0].thingy_id);

          thing.save(function(err) {
            if (err) throw err;
            test.equal(item.thingyId, thing.id);

            item.save(function(err) {
              if (err) throw err;
              test.equal(item.isDirty, false);

              client.query("SELECT * FROM items WHERE id=2", function(err, results) {
                if (err) throw err;
                test.equal(results[0].name, 'Balloon');
                test.equal(results[0].thingy_id, 4);

                test.done();
              });
            });
          });
        });
      });
    });
  },
  'test adding a thing by id with setter': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing');

    Item.find(2, function(err, item) {
      if (err) throw err;
      test.equal(item.thingyId, 0);
      item.thingyId = 2;
      test.equal(item.thingyId, 2);

      test.done();
    });
  },
  'test adding a non existent thing and trying to load it returns error': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing');

    Item.find(2, function(err, item) {
      if (err) throw err;
      item.thingyId = 20;

      item.getThingy(function(err, thing) {
        test.equal(err.constructor, Seq.errors.ItemNotFoundError);

        test.done();
      });
    });
  },
  'test reading a thing from item with getThing method': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing');

    Item.find(3, function(err, item) {
      if (err) throw err;

      item.getThingy(function(err, thing) {
        if (err) throw err;
        test.equal(item.isDirty, false);
        test.equal(thing.isNew, false);
        test.equal(thing.name, 'Door');

        test.done();
      });
    });
  },
  'test reading a thing from item that has no thing': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing');

    Item.find(2, function(err, item) {
      if (err) throw err;

      item.getThingy(function(err, thing) {
        test.equal(err.constructor, Seq.errors.ItemNotFoundError);

        test.done();
      });
    });
  },
  'test reading loaded thing will not make additional call': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing'),
        countQueries = 0;

    Seq.on('log', function(status, message) {
      if (message.match("SELECT things")) {
        ++countQueries;
      }
    });

    Item.find(3, function(err, item) {
      if (err) throw err;

      item.getThingy(function(err) {
        if (err) throw err;

        item.getThingy(function(err) {
          if (err) throw err;
          test.equal(countQueries, 1);

          Seq.removeAllListeners('log');
          test.done();
        });
      });
    });
  },
  'test immediate getter for getting when its loaded': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing');

    Item.find(3, function(err, item) {
      if (err) throw err;
      test.equal(item.thingyId, 1);
      test.equal(item.thingy, null);

      item.getThingy(function(err, thing) {
        if (err) throw err;
        test.equal(item.thingy, thing);

        test.done();
      });
    });
  },
  'test removing an association': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing');

    Item.find(3, function(err, item) {
      if (err) throw err;
      test.equal(item.isDirty, false);
      test.equal(item.thingyId, 1);
      item.removeThingy();
      test.equal(item.isDirty, true);
      test.equal(item.thingyId, 0);

      item.getThingy(function(err, thing) {
        test.equal(err.constructor, Seq.errors.ItemNotFoundError);

        item.save(function(err) {
          if (err) throw err;

          client.query("SELECT * FROM items WHERE id=3", function(err, result) {
            if (err) throw err;
            test.equal(result[0].thingy_id, 0);

            test.done();
          });
        });
      });
    });
  },
  'test removing an association of just added unsaved thing': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing'),
        thing = Thing.create({ name: 'newThing' });

    Item.find(2, function(err, item) {
      if (err) throw err;
      item.setThingy(thing);
      item.removeThingy();

      item.save(function(err) {
        if (err) throw err;

        client.query("SELECT * FROM items WHERE id=2", function(err, result) {
          if (err) throw err;
          test.equal(result[0].thingy_id, 0);

          test.done();
        });
      });
    });
  },
  'test adding and getting an associated item as a hasOne of a model': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing'),
        thing = Thing.create({ name: 'new thing' }),
        item  = Item.create({ name: 'new item' });

    thing.setMytem(item);
    test.equal(item.thingyId, 0);
    thing.save(function(err) {
      if (err) throw err;
      test.equal(item.thingyId, thing.id);

      item.getThingy(function(err, returnedThing) {
        if (err) throw err;
        test.equal(returnedThing.name, thing.name);
        test.equal(item.thingy, returnedThing);

        thing.getMytem(function(err, returnedItem) {
          if (err) throw err;
          test.equal(returnedItem, item);
          test.equal(thing.mytem, item);

          test.done();
        });
      });
    });
  },
  'test loading a hasOne associated item twice makes only one db call': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing'),
        item  = Item.create({ name: 'new item' }),
        countQueries = 0;

    Thing.find(1, function(err, thing) {
      if (err) throw err;
      Seq.on('log', function(status, message) {
        ++countQueries;
      });

      thing.getMytem(function(err, item) {
        if (err) throw err;

        thing.getMytem(function(err, returnedItem) {
          if (err) throw err;
          test.equal(countQueries, 1);
          test.equal(returnedItem, item);

          Seq.removeAllListeners('log');
          test.done();
        });
      });
    });
  },
  'test getting a hasOne association sets the associated id attribute': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing');


    Thing.find(1, function(err, thing) {
      if (err) throw err;
      test.equal(thing.isDirty, false);
      test.equal(thing.mytemId, 3);

      test.done();
    });
  },
  'test setting a hasOne association makes the record dirty': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing'),
        thing = Thing.create({ name: 'bla' });

    thing.save(function(err) {
      if (err) throw err;

      Item.find(2, function(err, item) {
        if (err) throw err;
        test.equal(thing.isDirty, false);
        thing.setMytem(item);
        test.equal(thing.isDirty, true);

        test.done();
      });
    });
  },
  'test setting a hasOne association sets the associated id attribute': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing'),
        thing = Thing.create({ name: 'bla' });

    Item.find(2, function(err, item) {
      if (err) throw err;
      test.equal(thing.mytemId, 0);
      thing.setMytem(item);
      test.equal(thing.mytemId, 2);

      test.done();
    });
  },
  'test removing an hasOne association': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing');

    Thing.find(1, function(err, thing) {
      if (err) throw err;
      test.equal(thing.isDirty, false);
      test.equal(thing.mytemId, 3);
      thing.removeMytem();
      test.equal(thing.isDirty, true);
      test.equal(thing.mytemId, 0);

      thing.save(function(err) {
        if (err) throw err;

        thing.getMytem(function(err) {
          test.equal(err.constructor, Seq.errors.ItemNotFoundError);

          thing.save(function(err) {
            if (err) throw err;

            client.query("SELECT * FROM items WHERE id=3", function(err, result) {
              if (err) throw err;
              test.equal(result[0].thingy_id, 0);

              test.done();
            });
          });
        });
      });
    });
  },
  'test removing a non existend associated item does nothing': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing'),
        countQueries = 0;

    Seq.on('log', function(status, message) {
      if (message.match("UPDATE `items`")) {
        ++countQueries;
      }
    });

    Thing.find(2, function(err, thing) {
      if (err) throw err;
      thing.removeMytem();

      thing.save(function(err) {
        if (err) throw err;
        test.equal(countQueries, 0);

        Seq.removeAllListeners('log');
        test.done();
      });
    });
  },
  'test removing an associated item from unsaved record': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing'),
        item  = Item.create({ name: 'just an item '}),
        thing = Thing.create({ name: 'just a thing '});

    thing.removeMytem();
    test.equal(thing.mytem, null);
    thing.setMytem(item);
    test.equal(thing.mytem, item);
    thing.removeMytem();
    test.equal(thing.mytem, null);

    test.done();
  }
};

module.exports['model'] = jaz.Object.extend({}, modelTests);
module.exports['model'].setUp = setup('object');

module.exports['model with late defined assoc'] = jaz.Object.extend({}, modelTests);
module.exports['model with late defined assoc'].setUp = setup('late defined');

var Seq         = require(__dirname + '/..'),
    jaz         = require('jaz-toolkit'),
    mysql       = require('mysql'),
    TEST_CONFIG = require(__dirname + '/test_config'),
    client      = mysql.createClient(TEST_CONFIG);

//THINK: Maybe addHasOneColumn adding a column to the database might not be the best of ideas
module.exports = {
  migration: {
    'add key': {
      setUp: function(cb) {
        var db  = Seq.createIfNotExistent(TEST_CONFIG);
        this.db = db;
        client.query("DROP TABLE items, things, some_special_things;", function() {
          db.createTable('things', function(table) {
            table.addColumn('name', Seq.dataTypes.VARCHAR());
          }, function(err) {
            if (err) throw err;
            cb();
          });
        });
      },
      'test adding foreign key for Things table': function(test) {
        this.db.createTable('items', function(table) {
          table.addColumn('name', Seq.dataTypes.VARCHAR());
          table.addBelongsToColumn('thing');
        }, function(err) {
          if (err) throw err;
          client.query("DESCRIBE items", function(err, result) {
            if (err) throw err;
            test.equal(result.length, 3, 'We should have a table with three fields');
            test.equal(result[0].Field, 'id');
            test.equal(result[1].Field, 'name');
            test.equal(result[1].Type, 'varchar(255)');
            test.equal(result[2].Field, 'thing_id');
            test.equal(result[2].Type, 'int(11)');
            test.equal(result[2].Key, 'MUL');
            test.done();
          });
        });
      },
      'test adding foreign key for SomeSpecialThings table': function(test) {
        this.db.createTable('items', function(table) {
          table.addColumn('name', Seq.dataTypes.VARCHAR());
          table.addBelongsToColumn('SomeSpecialThing');
        }, function(err) {
          if (err) throw err;
          client.query("DESCRIBE items", function(err, result) {
            if (err) throw err;
            test.equal(result.length, 3, 'We should have a table with three fields');
            test.equal(result[2].Field, 'some_special_thing_id');
            test.equal(result[2].Type, 'int(11)');
            test.equal(result[2].Key, 'MUL');
            test.done();
          });
        });
      },
      'test adding foreign key for Things table with another name': function(test) {
        this.db.createTable('items', function(table) {
          table.addColumn('name', Seq.dataTypes.VARCHAR());
          table.addBelongsToColumn('thing', { as: 'object' });
        }, function(err) {
          if (err) throw err;
          client.query("DESCRIBE items", function(err, result) {
            if (err) throw err;
            test.equal(result.length, 3, 'We should have a table with three fields');
            test.equal(result[2].Field, 'object_id');
            test.equal(result[2].Type, 'int(11)');
            test.equal(result[2].Key, 'MUL');
            test.done();
          });
        });
      },
      'test adding foreign key for Things as updateTable': function(test) {
        var db = this.db;
        db.createTable('items', function(table) {
          table.addColumn('name', Seq.dataTypes.VARCHAR());
        }, function(err) {
          db.updateTable('items', function(table) {
            table.addBelongsToColumn('thing', { as: 'object' });
          }, function(err) {
            if (err) throw err;
            client.query("DESCRIBE items", function(err, result) {
              if (err) throw err;
              test.equal(result.length, 3, 'We should have a table with three fields');
              test.equal(result[2].Field, 'object_id');
              test.equal(result[2].Type, 'int(11)');
              test.equal(result[2].Key, 'MUL');
              test.done();
            });
          });
        });
      }
    },
    'remove key': {
      setUp: function(cb) {
        var db  = Seq.createIfNotExistent(TEST_CONFIG);
        this.db = db;
        client.query("DROP TABLE items, things;", function() {
          db.createTable('things', function(table) {
            table.addColumn('name', Seq.dataTypes.VARCHAR());
          }, function(err) {
            if (err) throw err;
            db.createTable('items', function(table) {
              table.addColumn('name', Seq.dataTypes.VARCHAR());
              table.addBelongsToColumn('thing', { as: 'object' });
              table.addBelongsToColumn('awesomeThing');
            }, function(err) {
              if (err) throw err;
              cb();
            });
          });
        });
      },
      'test remove named reference to thing table': function(test) {
        this.db.updateTable('items', function(table) {
          table.removeBelongsToColumn('object');
        }, function(err) {
          if (err) throw err;
          client.query("DESCRIBE items", function(err, result) {
            if (err) throw err;
            test.equal(result.length, 3, 'We should have a table with three fields');
            test.equal(result[0].Field, 'id');
            test.equal(result[1].Field, 'name');
            test.equal(result[2].Field, 'awesome_thing_id');
            test.done();
          });
        });
      },
      'test remove camelcased reference to awesome_thing table': function(test) {
        this.db.updateTable('items', function(table) {
          table.removeBelongsToColumn('awesomeThing');
        }, function(err) {
          if (err) throw err;
          client.query("DESCRIBE items", function(err, result) {
            if (err) throw err;
            test.equal(result.length, 3, 'We should have a table with three fields');
            test.equal(result[0].Field, 'id');
            test.equal(result[1].Field, 'name');
            test.equal(result[2].Field, 'object_id');
            test.done();
          });
        });
      }
    },
    'migrator': {
      setUp: function(cb) {
        Seq.clearTableDefinitions();
        client.query("DROP TABLE items;", function() {
          Seq.createTable('items', function(table) {
            table.addColumn('name', Seq.dataTypes.VARCHAR());
            table.addBelongsToColumn('thing', { as: 'object' });
            table.addBelongsToColumn('awesomeThing');
          });
          cb();
        });
      },
      'test that columns were added': function(test) {
        var ItemTable = Seq.getTableFromMigration('Item');
        test.ok(ItemTable.id.equals(Seq.dataTypes.INT())); // hmm, should be changed to autoincrement stuff...
        test.ok(ItemTable.name.equals(Seq.dataTypes.VARCHAR()));
        test.ok(ItemTable.objectId.equals(Seq.dataTypes.INT({ allowNull: false })));
        test.ok(ItemTable.awesomeThingId.equals(Seq.dataTypes.INT({ allowNull: false })));
        test.done();
      },
      'test removing key removes column': function(test) {
        Seq.updateTable('items', function(table) {
          table.removeBelongsToColumn('object');
          table.removeBelongsToColumn('awesomeThing');
        });
        var ItemTable = Seq.getTableFromMigration('Item');
        test.ok(ItemTable.id.equals(Seq.dataTypes.INT())); // hmm, should be changed to autoincrement stuff...
        test.ok(ItemTable.name.equals(Seq.dataTypes.VARCHAR()));
        test.ok(!ItemTable.objectId);
        test.ok(!ItemTable.awesomeThingId);
        test.done();
      }
    }
  }
};

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
        client.query("INSERT INTO items (`id`, `name`, `thing_id`) VALUES " + valuesItems.join(','), jaz.Array.flatten(items), function(err) {
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
            table.addBelongsToColumn('thing');
          };

      Seq.createTable('things', thingsDef);
      Seq.createTable('items', itemsDef);
      if (type === 'object') {
        var Thing = Seq.defineModel('Thing', Seq.getTableFromMigration('things'));
        var Item  = Seq.defineModel('Item', Seq.getTableFromMigration('items'));
        Item.belongsTo(Thing);
        Thing.hasOne(Item);
      } else if (type === 'late defined') {
        Seq.removeModel('Thing');
        var Item  = Seq.defineModel('Item', Seq.getTableFromMigration('items'));
        Item.belongsTo('Thing');
        // and def
        var Thing = Seq.defineModel('Thing', Seq.getTableFromMigration('things'));
        Thing.hasOne('Item');
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
      item.thingId = 3;
      test.equal(item.isDirty, true);
      item.save(function(err) {
        client.query("SELECT * FROM items WHERE id=2", function(err, results) {
          if (err) throw err;
          test.equal(results[0].name, 'Balloon');
          test.equal(results[0].thing_id, 3);
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
        item.thing = thing;
        test.equal(item.isDirty, true);
        item.save(function(err) {
          client.query("SELECT * FROM items WHERE id=2", function(err, results) {
            if (err) throw err;
            test.equal(results[0].name, 'Balloon');
            test.equal(results[0].thing_id, 3);
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
        item.setThing(thing);
        test.equal(item.isDirty, true);
        test.equal(item.thingId, 3);

        item.save(function(err) {
          if (err) throw err;

          client.query("SELECT * FROM items WHERE id=2", function(err, results) {
            if (err) throw err;
            test.equal(results[0].name, 'Balloon');
            test.equal(results[0].thing_id, 3);

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
      item.setThing(thing);
      test.equal(item.isDirty, true);

      item.save(function(err) {
        test.equal(err.constructor, Seq.errors.AssociationsNotSavedError);
        test.equal(item.isDirty, true);

        client.query("SELECT * FROM items WHERE id=2", function(err, results) {
          if (err) throw err;
          test.equal(results[0].name, 'Balloon');
          test.ok(!results[0].thing_id);

          thing.save(function(err) {
            if (err) throw err;
            test.equal(item.thingId, thing.id);

            item.save(function(err) {
              if (err) throw err;
              test.equal(item.isDirty, false);

              client.query("SELECT * FROM items WHERE id=2", function(err, results) {
                if (err) throw err;
                test.equal(results[0].name, 'Balloon');
                test.equal(results[0].thing_id, 4);

                test.done();
              });
            });
          });
        });
      });
    });
  },
  'test adding a thing by id with setThing method': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing');

    Item.find(2, function(err, item) {
      if (err) throw err;
      test.equal(item.thingId, 0);
      item.thingId = 2;
      test.equal(item.thingId, 2);

      test.done();
    });
  },
  'test adding a non existent thing and trying to load it returns error': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing');

    Item.find(2, function(err, item) {
      if (err) throw err;
      item.thingId = 20;

      item.getThing(function(err, thing) {
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

      item.getThing(function(err, thing) {
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

      item.getThing(function(err, thing) {
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

      item.getThing(function(err) {
        if (err) throw err;

        item.getThing(function(err) {
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
      test.equal(item.thingId, 1);
      test.equal(item.thing, null);

      item.getThing(function(err, thing) {
        if (err) throw err;
        test.equal(item.thing, thing);

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
      test.equal(item.thingId, 1);
      item.removeThing();
      test.equal(item.isDirty, true);
      test.equal(item.thingId, 0);

      item.getThing(function(err, thing) {
        test.equal(err.constructor, Seq.errors.ItemNotFoundError);

        item.save(function(err) {
          if (err) throw err;

          client.query("SELECT * FROM items WHERE id=3", function(err, result) {
            if (err) throw err;
            test.equal(result[0].thing_id, 0);

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
      item.setThing(thing);
      item.removeThing();

      item.save(function(err) {
        if (err) throw err;
        // if no error, then test is passed
        test.done();
      });
    });
  },
  'test adding and getting an associated item as a hasone of a model': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing'),
        thing = Thing.create({ name: 'new thing' }),
        item  = Item.create({ name: 'new item' });

    thing.setItem(item);
    test.equal(item.thingId, 0);
    thing.save(function(err) {
      if (err) throw err;
      test.equal(item.thingId, thing.id);

      item.getThing(function(err, returnedThing) {
        if (err) throw err;
        test.equal(returnedThing.name, thing.name);
        test.equal(item.thing, returnedThing);

        thing.getItem(function(err, returnedItem) {
          if (err) throw err;
          test.equal(returnedItem, item);
          test.equal(thing.item, item);

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

      thing.getItem(function(err, item) {
        if (err) throw err;

        thing.getItem(function(err, returnedItem) {
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
      test.equal(thing.itemId, 3);

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
        thing.setItem(item);
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
      test.equal(thing.itemId, 0);
      thing.setItem(item);
      test.equal(thing.itemId, 2);

      test.done();
    });
  },
  'test removing an hasOne association': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing');

    Thing.find(1, function(err, thing) {
      if (err) throw err;
      test.equal(thing.isDirty, false);
      test.equal(thing.itemId, 3);
      thing.removeItem();
      test.equal(thing.isDirty, true);
      test.equal(thing.itemId, 0);

      thing.save(function(err) {
        if (err) throw err;

        thing.getItem(function(err) {
          test.equal(err.constructor, Seq.errors.ItemNotFoundError);

          thing.save(function(err) {
            if (err) throw err;

            client.query("SELECT * FROM items WHERE id=3", function(err, result) {
              if (err) throw err;
              test.equal(result[0].thing_id, 0);

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
      thing.removeItem();

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

    thing.removeItem();
    test.equal(thing.item, null);
    thing.setItem(item);
    test.equal(thing.item, item);
    thing.removeItem();
    test.equal(thing.item, null);

    test.done();
  }
};

module.exports['model'] = jaz.Object.extend({}, modelTests);
module.exports['model'].setUp = setup('object');

module.exports['model with late defined assoc'] = jaz.Object.extend({}, modelTests);
module.exports['model with late defined assoc'].setUp = setup('late defined');

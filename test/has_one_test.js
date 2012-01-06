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
        var db  = Seq.create(TEST_CONFIG);
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
          table.addHasOneColumn('thing');
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
          table.addHasOneColumn('SomeSpecialThing');
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
          table.addHasOneColumn('thing', { as: 'object' });
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
            table.addHasOneColumn('thing', { as: 'object' });
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
        var db  = Seq.create(TEST_CONFIG);
        this.db = db;
        client.query("DROP TABLE items, things;", function() {
          db.createTable('things', function(table) {
            table.addColumn('name', Seq.dataTypes.VARCHAR());
          }, function(err) {
            if (err) throw err;
            db.createTable('items', function(table) {
              table.addColumn('name', Seq.dataTypes.VARCHAR());
              table.addHasOneColumn('thing', { as: 'object' });
              table.addHasOneColumn('awesomeThing');
            }, function(err) {
              if (err) throw err;
              cb();
            });
          });
        });
      },
      'test remove named reference to thing table': function(test) {
        this.db.updateTable('items', function(table) {
          table.removeHasOneColumn('object');
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
          table.removeHasOneColumn('awesomeThing');
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
            table.addHasOneColumn('thing', { as: 'object' });
            table.addHasOneColumn('awesomeThing');
          });
          cb();
        });
      },
      'test that columns were added': function(test) {
        var ItemTable = Seq.getTableFromMigration('Item');
        test.ok(ItemTable.id.equals(Seq.dataTypes.INT())); // hmm, should be changed to autoincrement stuff...
        test.ok(ItemTable.name.equals(Seq.dataTypes.VARCHAR()));
        test.ok(ItemTable.objectId.equals(Seq.dataTypes.INT()));
        test.ok(ItemTable.awesomeThingId.equals(Seq.dataTypes.INT()));
        test.done();
      },
      'test removing key removes column': function(test) {
        Seq.updateTable('items', function(table) {
          table.removeHasOneColumn('object');
          table.removeHasOneColumn('awesomeThing');
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
    var db  = Seq.create(TEST_CONFIG);
    this.db = db;
    client.query("DROP TABLE things, items;", function() {
      var thingsDef = function(table) {
            table.addColumn('name', Seq.dataTypes.VARCHAR());
          },
          itemsDef = function(table) {
            table.addColumn('name', Seq.dataTypes.VARCHAR());
            table.addHasOneColumn('thing');
          };

      Seq.createTable('things', thingsDef);
      Seq.createTable('items', itemsDef);
      if (type === 'object') {
        var Thing = Seq.defineModel('Thing', Seq.getTableFromMigration('things'));
        var Item  = Seq.defineModel('Item', Seq.getTableFromMigration('items'));
        Item.hasOne(Thing);
      }
      if (type === 'late defined') {
        Seq.removeModel('Thing');
        var Item  = Seq.defineModel('Item', Seq.getTableFromMigration('items'));
        Item.hasOne('Thing');
        // and def
        var Thing = Seq.defineModel('Thing', Seq.getTableFromMigration('things'));
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
  'test adding a thing that is not saved to item with setThing method': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing');
    var thing = Thing.create({ name: 'newThing' });
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
    //TODO
    test.done();
  },
  'test reading a thing from item with instance attribute': function(test) {
    //TODO more magic (for example with load associations argument on item load??)
    test.done();
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
  'test reading a thing twice will not make a second database call': function(test) {
    //TODO
    test.done();
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
        test.done();
      });
    });
  },
  'test removing an association of just added unsaved thing': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing');
    var thing = Thing.create({ name: 'newThing' });
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
  }
};

module.exports['model'] = jaz.Object.extend({}, modelTests);
module.exports['model'].setUp = setup('object');

module.exports['model with late defined assoc'] = jaz.Object.extend({}, modelTests);
module.exports['model with late defined assoc'].setUp = setup('late defined');

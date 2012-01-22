var Seq         = require(__dirname + '/..'),
    jaz         = require('jaz-toolkit'),
    mysql       = require('mysql'),
    TEST_CONFIG = require(__dirname + '/test_config'),
    client      = mysql.createClient(TEST_CONFIG);


module.exports['migration'] = {
  setUp: function(cb) {
    var db  = Seq.createIfNotExistent(TEST_CONFIG);
    this.db = db;
    client.query("DROP TABLE items, things, items_to_things, awesome_items_to_awesome_things, awesome_things_to_beta_products;", function() {
      db.createTable('things', function(table) {
        table.addColumn('name', Seq.dataTypes.VARCHAR());
      }, function(err) {
        if (err) throw err;

        db.createTable('items', function(table) {
          table.addColumn('name', Seq.dataTypes.VARCHAR());
        }, function(err) {
          if (err) throw err;

          cb();
        });
      });
    });
  },
  'test creating an association table': function(test) {
    this.db.createManyToManyAssociationTable('item', 'thing', function(err) {
      if (err) throw err;
      client.query("DESCRIBE items_to_things;", function(err, result) {
        if (err) throw err;
        // at some point we have to remove id column
        test.equal(result.length, 3, 'We should have a table with two fields and an id');
        test.equal(result[1].Field, 'item_id');
        test.equal(result[1].Key, 'MUL');
        test.equal(result[1].Extra, '');
        test.equal(result[1].Type, 'int(11)');
        test.equal(result[2].Field, 'thing_id');
        test.equal(result[2].Key, '');
        test.equal(result[2].Extra, '');
        test.equal(result[2].Type, 'int(11)');
        test.done();
      });
    });
  },
  'test creating an association table with uppercase stuff': function(test) {
    this.db.createManyToManyAssociationTable('AwesomeItem', 'awesomeThing', function(err) {
      if (err) throw err;
      client.query("DESCRIBE awesome_items_to_awesome_things;", function(err, result) {
        if (err) throw err;
        // at some point we have to remove id column
        test.equal(result.length, 3, 'We should have a table with two fields and an id');
        test.equal(result[1].Field, 'awesome_item_id');
        test.equal(result[1].Key, 'MUL');
        test.equal(result[1].Extra, '');
        test.equal(result[1].Type, 'int(11)');
        test.equal(result[2].Field, 'awesome_thing_id');
        test.equal(result[2].Key, '');
        test.equal(result[2].Extra, '');
        test.equal(result[2].Type, 'int(11)');
        test.done();
      });
    });
  },
  'test creating an association table with uppercase stuff and alphabetically unsorted items': function(test) {
    this.db.createManyToManyAssociationTable('BetaProduct', 'awesomeThing', function(err) {
      if (err) throw err;
      client.query("DESCRIBE awesome_things_to_beta_products;", function(err, result) {
        if (err) throw err;
        // at some point we have to remove id column
        test.equal(result.length, 3, 'We should have a table with two fields and an id');
        test.equal(result[1].Field, 'beta_product_id');
        test.equal(result[1].Key, 'MUL');
        test.equal(result[1].Extra, '');
        test.equal(result[1].Type, 'int(11)');
        test.equal(result[2].Field, 'awesome_thing_id');
        test.equal(result[2].Key, '');
        test.equal(result[2].Extra, '');
        test.equal(result[2].Type, 'int(11)');
        test.done();
      });
    });
  },
  'test removing an association table': function(test) {
    var db = this.db;
    db.createManyToManyAssociationTable('item', 'thing', function(err) {
      if (err) throw err;
      db.dropManyToManyAssociationTable('item', 'thing', function(err) {
        if (err) throw err;
        client.query("DESCRIBE items_to_things;", function(err, result) {
          test.ok(err);
          test.done();
        });
      });
    });
  }
};


var generateTestData = function(db, thingsDef, itemsDef, cb) {
  db.createTable('things', thingsDef, function() {
    db.createTable('items', itemsDef, function() {
      db.createManyToManyAssociationTable('item', 'thing', function(err) {
        var things = [],
            items  = [],
            assocs = [];
        items.push("(1, 'Bicycle')");
        items.push("(2, 'Balloon')");
        items.push("(3, 'House')");
        things.push("(1,'Door')");
        things.push("(2,'Bell')");
        things.push("(3,'Air')");
        assocs.push('(3,1)');
        assocs.push('(3,2)');
        
        client.query("INSERT INTO things (`id`, `name`) VALUES " + things.join(','), function(err) {
          if (err) throw err;
          client.query("INSERT INTO items (`id`, `name`) VALUES " + items.join(','), function(err) {
            if (err) throw err;
            client.query("INSERT INTO items_to_things (`item_id`, `thing_id`) VALUES " + assocs.join(','), function(err) {
              if (err) throw err;
              cb();
            });
          });
        });
      });
    });
  });
};

var setup = function(type) {
  return function(cb) {
    var db  = Seq.createIfNotExistent(TEST_CONFIG);
    this.db = db;
    client.query("DROP TABLE things, items, items_to_things;", function() {
      var thingsDef = function(table) {
            table.addColumn('name', Seq.dataTypes.VARCHAR());
          },
          itemsDef = function(table) {
            table.addColumn('name', Seq.dataTypes.VARCHAR());
          };

      Seq.clearTableDefinitions();
      Seq.createTable('things', thingsDef);
      Seq.createTable('items', itemsDef);
      Seq.removeModel('Item');
      Seq.removeModel('Thing');
      if (type === 'object') {
        var Thing = Seq.defineModel('Thing', Seq.getTableFromMigration('things'));
        var Item  = Seq.defineModel('Item', Seq.getTableFromMigration('items'));
        Item.hasAndBelongsToMany(Thing);
        Thing.hasAndBelongsToMany(Item);
      }
      if (type === 'late defined') {
        var Item  = Seq.defineModel('Item', Seq.getTableFromMigration('items'));
        Item.hasAndBelongsToMany('Thing');
        // and def
        var Thing = Seq.defineModel('Thing', Seq.getTableFromMigration('things'));
        Thing.hasAndBelongsToMany('Item');
      }

      generateTestData(db, thingsDef, itemsDef, cb);
    });
  };
};

var modelTests = {
  'test adding no thing to item': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing'),
        item  = Item.create({ name: 'an item' });

    item.addThings();
    test.equal(item.things.length, 0);
    item.addThing();
    test.equal(item.things.length, 0);
    test.equal(item.countAddedAssociations('Thing'), 0);

    test.done();
  },
  'test getting countNotSavedAssociations throws error if association not existent': function(test) {
    var Item  = Seq.getModel('Item'),
        item  = Item.create({ name: 'an item' });

    test.throws(function() {
      item.countAddedAssociations('Thingy');
    }, Seq.errors.AssociationNotDefinedError);

    test.done();
  },
  'test adding a thing to item': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing'),
        item1 = Item.create({ name: 'an item' }),
        item2 = Item.create({ name: 'item two' }),
        thing = Thing.create({ name: 'a thing' });

    item1.addThings(thing);
    test.equal(item1.things.length, 1);
    item2.addThing(thing);
    test.equal(item2.things.length, 1);
    test.equal(item1.things.length, 1, "item1 should not have changed");
    test.equal(item1.countAddedAssociations('Thing'), 1);

    test.done();
  },
  'test adding multiple thing to item': function(test) {
    var Item   = Seq.getModel('Item'),
        Thing  = Seq.getModel('Thing'),
        item   = Item.create({ name: 'an item' }),
        item2  = Item.create({ name: 'item two' }),
        item3  = Item.create({ name: 'item three' }),
        thing  = Thing.create({ name: 'a thing' }),
        thing2 = Thing.create({ name: 'another thing' });

    item.addThings(thing, thing2);
    test.equal(item.things.length, 2);

    item2.addThing(thing, thing2);
    test.equal(item2.things.length, 2);

    item3.addThings([thing, thing2]);
    test.equal(item3.things.length, 2);

    test.done();
  },
  'test if item gets dirty if thing is added': function(test) {
    var Item   = Seq.getModel('Item'),
        Thing  = Seq.getModel('Thing'),
        thing  = Thing.create({ name: 'a thing' }),
        thing2 = Thing.create({ name: 'another thing' });
    
    Item.find(1, function(err, item) {
      if (err) throw err;
      item.addThing();
      test.equal(item.isDirty, false);
      item.addThings();
      test.equal(item.isDirty, false);
      item.addThings([]);
      test.equal(item.isDirty, false);
      item.addThing(thing);
      test.equal(item.isDirty, true);

      test.done();
    });
  },
  'test item stays undirty if associated thing is already assigned to item': function(test) {
    var Item   = Seq.getModel('Item'),
        Thing  = Seq.getModel('Thing');
    
    Item.find(3, function(err, item) {
      if (err) throw err;

      Thing.find(1, function(err, thing) {
        if (err) throw err;
        item.addThing(thing);
        test.equal(item.isDirty, false);
        test.equal(item.countAddedAssociations('Thing'), 0);
        test.equal(item.thingIds.length, 2);

        test.done();
      });
    });
  },
  'test save item with things that are not saved returns error': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing'),
        item  = Item.create({ name: 'an item' }),
        thing = Thing.create({ name: 'a thing' });

    item.addThing(thing);
    item.save(function(err) {
      test.equal(err.constructor, Seq.errors.AssociationsNotSavedError);
      test.equal(item.isDirty, true);
      test.equal(item.id, 0);

      client.query("SELECT * FROM items WHERE name='an item'", function(err, results) {
        if (err) throw err;
        test.equal(results.length, 0);

        test.done();
      });
    });
  },
  'test save item with already saved things': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing'),
        item  = Item.create({ name: 'my name' });

    item.save(function(err) {
      if (err) throw err;

      Thing.findAll({ where: 'things.id<=2' }, function(err, things) {
        if (err) throw err;
        item.addThings(things);
        test.equal(item.isDirty, true);
        test.equal(item.countAddedAssociations('Thing'), 2);

        item.save(function(err) {
          if (err) throw err;
          test.equal(item.isDirty, false);
          test.equal(item.countAddedAssociations('Thing'), 0);
          test.equal(item.thingIds[0], 1);
          test.equal(item.thingIds[1], 2);

          client.query("SELECT * FROM items_to_things WHERE item_id=" + item.id, function(err, results) {
            if (err) throw err;
            test.equal(results.length, 2);
            test.equal(results[0].thing_id, 1);
            test.equal(results[1].thing_id, 2);

            test.done();
          });
        });
      });
    });
  },
  'test saving a thing that is already added to item will add its id to association list': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing'),
        item  = Item.create({ name: 'an item' }),
        thing = Thing.create({ name: 'a thing' });

    item.addThing(thing);
    test.equal(item.thingIds.length, 0);

    thing.save(function(err) {
      if (err) throw err;
      test.equal(item.thingIds[0], thing.id);

      test.done();
    });
  },
  'test adding no thing to item changes nothing': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing'),
        item  = Item.create({ name: 'an item' });

    Item.find(2, function(err, item) {
      if (err) throw err;
      item.addThing();
      test.equal(item.isDirty, false);
      test.equal(item.things.length, 0);
      test.equal(item.thingIds.length, 0);

      item.addThing([]);
      test.equal(item.isDirty, false);
      test.equal(item.things.length, 0);
      test.equal(item.thingIds.length, 0);

      item.addThing(0);
      test.equal(item.isDirty, false);
      test.equal(item.things.length, 0);
      test.equal(item.thingIds.length, 0);

      test.done();
    });
  },
  'test adding a thing to item as id': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing'),
        item  = Item.create({ name: 'an item' });

    item.addThing(1);
    test.equal(item.isDirty, true);
    test.equal(item.things.length, 0);
    test.equal(item.thingIds[0], 1);
    test.equal(item.countAddedAssociations('Thing'), 1);

    item.save(function(err) {
      if (err) throw err;
      test.equal(item.isDirty, false);
      test.equal(item.things.length, 0);
      test.equal(item.thingIds[0], 1);
      test.equal(item.countAddedAssociations('Thing'), 0);

      client.query("SELECT * FROM items_to_things WHERE item_id=" + item.id, function(err, results) {
        if (err) throw err;
        test.equal(results.length, 1);
        test.equal(results[0].thing_id, 1);

        test.done();
      });
    });
  },
  'test loading associated items of item we just added': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing'),
        item  = Item.create({ name: 'an item' });

    item.addThing(1);

    item.save(function(err) {
      if (err) throw err;

      item.getThings(function(err, things) {
        if (err) throw err;
        test.equal(things.length, 1);
        test.equal(things[0].id, 1);

        test.done();
      });
    });
  },
  'test loading associated id of item we just added': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing'),
        item  = Item.create({ name: 'an item' });

    item.addThing(1);

    item.save(function(err) {
      if (err) throw err;

      item.getThing(1, function(err, thing) {
        if (err) throw err;
        test.equal(thing.class, 'ThingModel');
        test.equal(thing.id, 1);

        test.done();
      });
    });
  },
  'test loading one associated item from loaded item': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing');

    Item.find(3, function(err, item) {
      if (err) throw err;

      item.getThing(2, function(err, thing) {
        if (err) throw err;
        test.equal(thing.id, 2);

        test.done();
      });
    });
  },
  'test load associtated items from item': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing'),
        thing = Thing.create({ name: 'test' });

    Item.find(3, function(err, item) {
      if (err) throw err;
      test.equal(item.things.length, 0, 'We should have not loaded any yet');
      test.equal(item.thingIds.length, 2, 'but there should be two to load');
      test.equal(item.countAllThings(), 2);
      test.equal(item.countAddedAssociations('Thing'), 0);

      item.getThings(function(err, things) {
        if (err) throw err;
        test.equal(things.length, 2);
        test.equal(things[0].id, 1)
        test.equal(things[1].id, 2)
        test.equal(item.countAddedAssociations('Thing'), 0);

        test.done();
      });
    });
  },
  'test load associated items after we added one': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing'),
        thing = Thing.create({ name: 'test' });

    Item.find(3, function(err, item) {
      if (err) throw err;
      item.addThing(thing);
      test.equal(item.things.length, 1, 'We added one thing');
      test.equal(item.thingIds.length, 2, 'but there should be two things in db to load');
      test.equal(item.countAllThings(), 3, 'this makes three things in total');
      test.equal(item.countAddedAssociations('Thing'), 1);

      item.getThings(function(err, things) {
        if (err) throw err;
        test.equal(item.things.length, 3, 'We have loaded all now');
        test.equal(item.thingIds.length, 2, 'but there should be only two things in db to load');
        test.equal(item.countAllThings(), 3, 'this are three things');
        test.equal(item.countAddedAssociations('Thing'), 1);
        test.equal(things.length, 3, 'we get saved and unsaved items');
        test.equal(things[0].id, 0);
        test.equal(things[0].name, 'test');
        test.equal(things[1].id, 1);
        test.equal(things[2].id, 2);

        test.done();
      });
    });
  },
  'test we dont load things we already have loaded': function(test) {
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

      item.getThings(function(err, things) {
        if (err) throw err;

        item.getThings(function(err, things) {
          if (err) throw err;
          test.equal(countQueries, 1);

          Seq.removeAllListeners('log');
          test.done();
        });
      });
    });
  },
  'test we dont load things we already have loaded but get also added items': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing'),
        thing = Thing.create({ name: 'test' }),
        countQueries = 0;

    Seq.on('log', function(status, message) {
      if (message.match("SELECT things")) {
        ++countQueries;
      }
    });

    Item.find(3, function(err, item) {
      if (err) throw err;
      item.addThing(thing);

      item.getThings(function(err, things) {
        if (err) throw err;
        test.equal(things.length, 3);

        item.getThings(function(err, things) {
          if (err) throw err;
          test.equal(things.length, 3);
          test.equal(countQueries, 1);

          Seq.removeAllListeners('log');
          test.done();
        });
      });
    });
  },
  'test we dont load a thing we already have loaded in a batch before': function(test) {
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

      item.getThings(function(err, things) {
        if (err) throw err;

        item.getThing(things[0].id, function(err) {
          if (err) throw err;
          test.equal(countQueries, 1);

          Seq.removeAllListeners('log');
          test.done();
        });
      });
    });
  },
  'test we dont load a thing twice we already have loaded': function(test) {
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

      item.getThing(2, function(err) {
        if (err) throw err;

        item.getThing(2, function(err) {
          if (err) throw err;
          test.equal(countQueries, 1);

          Seq.removeAllListeners('log');
          test.done();
        });
      });
    });
  },
  'test getting non existing thing will return error': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing');
    
    Item.find(3, function(err, item) {
      if (err) throw err;

      item.getThing(4, function(err, thing) {
        test.equal(err.constructor, Seq.errors.NotAssociatedItemError)

        test.done();
      });
    });
  },
  'test removing a thing from item which was not saved': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing');

    Item.find(1, function(err, item) {
      if (err) throw err;

      Thing.findAll({ where: 'things.id<=2' }, function(err, things) {
        if (err) throw err;
        item.addThings(things);
        test.equal(item.countAddedAssociations('Thing'), 2);
        item.removeThing(things[0]);
        test.equal(item.countAddedAssociations('Thing'), 1);
        test.equal(item.isDirty, true);

        item.save(function(err) {
          if (err) throw err;
          test.equal(item.isDirty, false);

          client.query("SELECT * FROM items_to_things WHERE item_id=1", function(err, results) {
            if (err) throw err;
            test.equal(results.length, 1);
            test.equal(results[0].thing_id, 2);

            test.done();
          });
        });
      });
    });
  },
  'test removing all things we just added to item': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing'),
        item  = Item.create({ name: 'an item' }),
        thing = Thing.create({ name: 'a thing' }),
        thing2 = Thing.create({ name: 'another thing' });

    item.addThing(thing, thing2);
    test.equal(item.things.length, 2);
    test.equal(item.countAddedAssociations('Thing'), 2);
    item.removeAllThings();
    test.equal(item.things.length, 0);
    test.equal(item.countAddedAssociations('Thing'), 0);
    item.save(function(err, savedItem) {
      if (err) throw err;

      savedItem.getThings(function(err, things) {
        if (err) throw err;
        test.equal(things.length, 0);

        test.done();
      });
    });
  },
  'test removing a thing we just added to item and which isNew': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing'),
        item  = Item.create({ name: 'an item' }),
        thing = Thing.create({ name: 'a thing' }),
        thing2 = Thing.create({ name: 'another thing' });

    item.addThing(thing, thing2);
    test.equal(item.things.length, 2);
    test.equal(item.countAddedAssociations('Thing'), 2);
    item.removeThing(thing2);
    test.equal(item.things.length, 1);
    test.equal(item.countAddedAssociations('Thing'), 1);
    test.equal(item.countThingsToRemove(), 0, 'we removed no thing that is in db');

    test.done();
  },
  'test removing one thing by id from item we loaded': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing');

    Item.find(3, function(err, item) {
      if (err) throw err;
      test.equal(item.countAllThings(), 2);
      item.removeThing(1);
      test.equal(item.countAllThings(), 1);
      test.equal(item.countThingsToRemove(), 1);

      item.save(function(err, savedItem) {
        if (err) throw err;
        test.equal(item.countThingsToRemove(), 0);

        Item.find(3, function(err, reloadedItem) {
          if (err) throw err;
          test.equal(reloadedItem.countAllThings(), 1);

          reloadedItem.getThings(function(err, things) {
            if (err) throw err;
            test.equal(things.length, 1);
            test.equal(reloadedItem.things.length, 1);

            test.done();
          });
        });
      });
    });
  },
  'test if thing gets dirty if item is added': function(test) {
    var Item   = Seq.getModel('Item'),
        Thing  = Seq.getModel('Thing'),
        thing  = Thing.create({ name: 'a thing' }),
        thing2 = Thing.create({ name: 'another thing' });
    
    Thing.find(1, function(err, thing) {
      if (err) throw err;
      thing.addItem();
      test.equal(thing.isDirty, false);
      thing.addItems();
      test.equal(thing.isDirty, false);
      thing.addItems([]);
      test.equal(thing.isDirty, false);
      thing.addItem(thing);
      test.equal(thing.isDirty, true);

      test.done();
    });
  },
  'test if thing returns error if associated items are not saved': function(test) {
    var Item   = Seq.getModel('Item'),
        Thing  = Seq.getModel('Thing'),
        item   = Item.create({ name: 'lala' });
    
    Thing.find(1, function(err, thing) {
      if (err) throw err;
      thing.addItem(item);

      thing.save(function(err) {
        test.equal(err.constructor, Seq.errors.AssociationsNotSavedError);
    
        test.done();
      });
    });
  },
  'test if thing can add and save items': function(test) {
    var Item   = Seq.getModel('Item'),
        Thing  = Seq.getModel('Thing'),
        item   = Item.create({ name: 'lala' });
    
    Thing.find(3, function(err, thing) {
      if (err) throw err;
      thing.addItem(item);

      item.save(function(err) {
        if (err) throw err;

        thing.save(function(err) {
          if (err) throw err;
      
          client.query("SELECT * FROM items_to_things WHERE thing_id=3", function(err, results) {
            if (err) throw err;
            test.equal(results.length, 1);
            test.equal(results[0].item_id, item.id);
            test.equal(results[0].thing_id, 3);

            test.done();
          });
        });
      });
    });
  },
  'test if getting associated items of unsaved record returns all just added items': function(test) {
    var Item   = Seq.getModel('Item'),
        Thing  = Seq.getModel('Thing'),
        item   = Item.create({ name: 'an item' }),
        thing  = Thing.create({ name: 'a thing' });
    
    thing.addItem(item);

    Item.find(2, function(err, item2) {
      if (err) throw err;
      thing.addItem(item2);

      thing.getItems(function(err, items) {
        if (err) throw err;
        test.equal(items.length, 2);
        test.equal(items[0], item);
        test.equal(items[1], item2);

        test.done();
      });
    });
  }
};
//TODO: change some tests for the other direction
//TODO: add tests for mutual changing 

module.exports['model'] = jaz.Object.extend({}, modelTests);
module.exports['model'].setUp = setup('object');

module.exports['model with late defined assoc'] = jaz.Object.extend({}, modelTests);
module.exports['model with late defined assoc'].setUp = setup('late defined');

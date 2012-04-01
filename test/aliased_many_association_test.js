var Seq         = require(__dirname + '/..'),
    jaz         = require('jaz-toolkit'),
    mysql       = require('mysql'),
    TEST_CONFIG = require(__dirname + '/test_config'),
    client      = mysql.createClient(TEST_CONFIG);

//THINK: Maybe addHasOneColumn adding a column to the database might not be the best of ideas

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
      things.push([ 1, 'Bicycle' ]);
      things.push([ 2, 'Balloon' ]);
      things.push([ 3, 'House' ]);
      valuesItems.push('(?,?,?)');
      valuesItems.push('(?,?,?)');
      valuesItems.push('(?,?,?)');
      items.push([ 1, 'Door', 3 ]);
      items.push([ 2, 'Bell', 3 ]);
      items.push([ 3, 'Air', 0 ]);

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
            table.addBelongsToColumn('thing');
          };

      Seq.createTable('things', thingsDef);
      Seq.createTable('items', itemsDef);
      if (type === 'object') {
        var Thing = Seq.defineModel('Thing', Seq.getTableFromMigration('things'));
        var Item  = Seq.defineModel('Item', Seq.getTableFromMigration('items'));
        Item.belongsTo(Thing, { name: 'Thingy' });
        Item.belongsTo(Thing);
        Thing.hasMany(Item, { name: 'Mytem', selfName: 'Thingy' });
        Thing.hasMany(Item, { name: 'Item' });
      }
      if (type === 'late defined') {
        Seq.removeModel('Thing');
        var Item  = Seq.defineModel('Item', Seq.getTableFromMigration('items'));
        Item.belongsTo('Thing', { name: 'Thingy' });
        Item.belongsTo('Thing');
        // and def
        var Thing = Seq.defineModel('Thing', Seq.getTableFromMigration('things'));
        Thing.hasMany('Item', { name: 'Mytem', selfName: 'Thingy' });
        Thing.hasMany('Item', { name: 'Item' });
      }

      generateTestData(db, thingsDef, itemsDef, cb);
    });
  };
};

var modelTests = {
  tearDown: function(cb) {
    cb();
  },
  'test reading ids of has many connected items to record (positive test)': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing');

    Thing.find(3, function(err, thing) {
      if (err) throw err;
      test.equal(thing.mytemIds.length, 2);
      test.equal(thing.mytemIds[0], 1);
      test.equal(thing.mytemIds[1], 2);

      test.done();
    });
  },
  'test reading ids of has many connected items to record (negative test)': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing');

    Thing.find(2, function(err, thing) {
      if (err) throw err;
      test.equal(thing.mytemIds.length, 0);
      test.equal(thing.mytemIds.constructor, Array);

      test.done();
    });
  },
  'test adding one or many ids to associated id list works as expected': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing');

    Thing.find(2, function(err, thing) {
      if (err) throw err;
      test.equal(thing.isDirty, false);
      thing.addMytem();
      test.equal(thing.isDirty, false);
      thing.addMytem([]);
      test.equal(thing.isDirty, false);
      thing.addMytem(0);
      test.equal(thing.isDirty, false);
      test.equal(thing.countAddedAssociations('Mytem'), 0);
      thing.addMytem(1);
      test.equal(thing.isDirty, true);
      test.equal(thing.mytemIds.length, 1);
      test.equal(thing.mytemIds[0], 1);
      test.equal(thing.countAddedAssociations('Mytem'), 1);
      thing.addMytem(2,3);
      test.equal(thing.isDirty, true);
      test.equal(thing.mytemIds.length, 3);
      test.equal(thing.mytemIds[1], 2);
      test.equal(thing.mytemIds[2], 3);
      test.equal(thing.countAddedAssociations('Mytem'), 3);

      test.done();
    });
  },
  'test adding an associated item as id twice will not add it twice': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing');

    Thing.find(3, function(err, thing) {
      if (err) throw err;
      test.equal(thing.isDirty, false);
      test.equal(thing.mytemIds.length, 2);
      test.equal(thing.countAddedAssociations('Mytem'), 0);

      thing.addMytem(1);
      test.equal(thing.isDirty, false);
      test.equal(thing.mytemIds.length, 2);
      test.equal(thing.countAddedAssociations('Mytem'), 0);

      thing.addMytem(2);
      test.equal(thing.isDirty, false);
      test.equal(thing.mytemIds.length, 2);
      test.equal(thing.countAddedAssociations('Mytem'), 0);

      thing.addMytem(1,2);
      test.equal(thing.isDirty, false);
      test.equal(thing.mytemIds.length, 2);
      test.equal(thing.countAddedAssociations('Mytem'), 0);

      thing.addMytem([1,2,2]);
      test.equal(thing.isDirty, false);
      test.equal(thing.mytemIds.length, 2);
      test.equal(thing.countAddedAssociations('Mytem'), 0);

      thing.addMytem(1,3);
      test.equal(thing.isDirty, true);
      test.equal(thing.mytemIds.length, 3);
      test.equal(thing.countAddedAssociations('Mytem'), 1);

      test.done();
    });
  },
  'test addMytem is equals to addMytems': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing'),
        thing = Thing.create({ name: 'bla' });

    test.equal(thing.addMytem, thing.addMytems);

    test.done();
  },
  'test adding associated items as records instances works': function(test) {
    var Item   = Seq.getModel('Item'),
        Thing  = Seq.getModel('Thing'),
        item1  = Item.create({ name: 'an item' }),
        item2  = Item.create({ name: 'item two' });

    Thing.find(1, function(err, thing) {
      if (err) throw err;
      Thing.find(2, function(err, thing2) {
        if (err) throw err;
        test.equal(thing.mytems.length, 0);
        test.equal(thing.isDirty, false);
        test.equal(thing.countAddedAssociations('Mytem'), 0);

        thing.addMytem(item1);
        test.equal(thing.mytems.length, 1);
        test.equal(thing.isDirty, true);
        test.equal(thing.countAddedAssociations('Mytem'), 1);

        thing.addMytem(item1);
        test.equal(thing.mytems.length, 1);
        test.equal(thing.countAddedAssociations('Mytem'), 1);

        thing.addMytem(item2);
        test.equal(thing.mytems.length, 2);
        test.equal(thing.countAddedAssociations('Mytem'), 2);

        test.equal(thing2.mytems.length, 0);
        test.equal(thing2.isDirty, false);
        thing2.addMytems(item1, item2);
        test.equal(thing2.mytems.length, 2);
        test.equal(thing2.isDirty, true);

        test.done();
      });
    });
  },
  'test getting countNotSavedAssociations throws error if association not existent': function(test) {
    var Thing  = Seq.getModel('Thing'),
        thing  = Thing.create({ name: 'a thing' });

    test.throws(function() {
      thing.countAddedAssociations('Ite');
    }, Seq.errors.AssociationNotDefinedError);

    test.done();
  },
  'test if associated item can first be added as id and then as record': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing'),
        thing = Thing.create({ name: 'great stuff' });

    Item.find(1, function(err, item) {
      if (err) throw err;
      thing.addMytem(1);
      test.equal(thing.mytems.length, 0);
      test.equal(thing.mytemIds.length, 1);
      test.equal(thing.mytemIds[0], item.id);
      test.equal(thing.countAddedAssociations('Mytem'), 1);

      thing.addMytem(item);
      test.equal(thing.mytems.length, 1);
      test.equal(thing.mytemIds.length, 1);
      test.equal(thing.mytemIds[0], item.id);
      test.equal(thing.countAddedAssociations('Mytem'), 1);

      test.done();
    });
  },
  'test if associated item can first be added as record and then as id': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing'),
        thing = Thing.create({ name: 'great stuff' });

    Item.find(1, function(err, item) {
      if (err) throw err;
      thing.addMytem(item);
      test.equal(thing.mytems.length, 1);
      test.equal(thing.mytemIds.length, 1);
      test.equal(thing.mytemIds[0], item.id);
      test.equal(thing.countAddedAssociations('Mytem'), 1);

      thing.addMytem(1);
      test.equal(thing.mytems.length, 1);
      test.equal(thing.mytemIds.length, 1);
      test.equal(thing.mytemIds[0], item.id);
      test.equal(thing.countAddedAssociations('Mytem'), 1);

      test.done();
    });
  },
  'test save item with things that are not saved returns error': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing'),
        item  = Item.create({ name: 'an item' }),
        thing = Thing.create({ name: 'a thing' });

    thing.addMytem(item);
    thing.save(function(err) {
      test.equal(err.constructor, Seq.errors.AssociationsNotSavedError);
      test.equal(thing.isDirty, true);
      test.equal(thing.id, 0);

      client.query("SELECT * FROM things WHERE name='a thing'", function(err, results) {
        if (err) throw err;
        test.equal(results.length, 0);

        test.done();
      });
    });
  },
  'test save item with added associated ids': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing'),
        thing = Thing.create({ name: 'a thing' });

    thing.save(function(err) {
      if (err) throw err;
      test.equal(thing.isDirty, false);

      thing.addMytems(2,3);
      test.equal(thing.isDirty, true);
      test.equal(thing.countAddedAssociations('Mytem'), 2);

      thing.save(function(err) {
        if (err) throw err;
        test.equal(thing.isDirty, false);
        test.equal(thing.countAddedAssociations('Mytem'), 0);
        test.equal(thing.id, 4);

        client.query("SELECT * FROM items WHERE thingy_id=4", function(err, results) {
          if (err) throw err;
          test.equal(results.length, 2);
          test.equal(results[0].id, 2);
          test.equal(results[1].id, 3);

          test.done();
        });
      });
    });
  },
  'test saving an associated item that is already added will add its id to association list': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing'),
        item  = Item.create({ name: 'my item' }),
        thing = Thing.create({ name: 'great stuff' });

    thing.addMytem(item);
    test.equal(thing.mytemIds.length, 0);

    item.save(function(err) {
      if (err) throw err;
      test.equal(thing.mytemIds[0], item.id);

      test.done();
    });
  },
  'test loading associated items of record we just added': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing'),
        thing = Thing.create({ name: 'BAM' });
    thing.addMytems(2, 3);

    thing.save(function(err) {
      if (err) throw err;

      thing.getMytems(function(err, items) {
        if (err) throw err;
        test.equal(items.length, 2);
        test.equal(items[0].id, 2);
        test.equal(items[1].id, 3);

        test.done();
      });
    });
  },
  'test loading associated item via id of record we just added': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing'),
        thing = Thing.create({ name: 'BAM' });

    thing.addMytem(2);

    thing.save(function(err) {
      if (err) throw err;

      thing.getMytem(2, function(err, item) {
        if (err) throw err;
        test.equal(item.class, 'ItemModel');
        test.equal(item.id, 2);

        test.done();
      });
    });
  },
  'test loading non associated item via id of record we just added': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing'),
        thing = Thing.create({ name: 'BAM' });

    thing.addMytem(2);

    thing.save(function(err) {
      if (err) throw err;

      thing.getMytem(3, function(err, item) {
        test.equal(err.constructor, Seq.errors.NotAssociatedItemError)

        test.done();
      });
    });
  },
  'test loading associated items of record from db': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing');

    Thing.find(3, function(err, thing) {
      if (err) throw err;

      thing.getMytems(function(err, items) {
        if (err) throw err;
        test.equal(items.length, 2);
        test.equal(items[0].id, 1);
        test.equal(items[1].id, 2);

        test.done();
      });
    });
  },
  'test removing an associated item from record which was not saved': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing');

    Thing.find(1, function(err, thing) {
      if (err) throw err;

      Item.findAll({ where: 'items.id<=2' }, function(err, items) {
        if (err) throw err;
        thing.addMytems(items);
        test.equal(thing.countAddedAssociations('Mytem'), 2);
        thing.removeMytem(items[0]);
        test.equal(thing.countAddedAssociations('Mytem'), 1);
        test.equal(thing.isDirty, true);

        thing.save(function(err) {
          if (err) throw err;
          test.equal(thing.isDirty, false);
          thing.removeMytem(items[1]);
          test.equal(thing.isDirty, true);

          client.query("SELECT * FROM items WHERE thingy_id=1", function(err, results) {
            if (err) throw err;
            test.equal(results.length, 1);
            test.equal(results[0].id, 2);

            test.done();
          });
        });
      });
    });
  },
  'test removing all items we just added to item': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing'),
        item  = Item.create({ name: 'an item' }),
        item2 = Item.create({ name: 'an item too' }),
        thing = Thing.create({ name: 'a thing' });

    thing.addMytem(item, item2);
    test.equal(thing.mytems.length, 2);
    test.equal(thing.countAddedAssociations('Mytem'), 2);
    thing.removeAllMytems();
    test.equal(thing.mytems.length, 0);
    test.equal(thing.countAddedAssociations('Mytem'), 0);

    thing.save(function(err, savedThing) {
      if (err) throw err;

      savedThing.getMytems(function(err, items) {
        if (err) throw err;
        test.equal(items.length, 0);

        test.done();
      });
    });
  },
  'test removing all items of loaded item': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing');

    Thing.find(3, function(err, thing) {
      if (err) throw err;
      test.equal(thing.mytemIds.length, 2);
      thing.removeAllMytems();
      test.equal(thing.mytemIds.length, 0);
      test.equal(thing.countMytemsToRemove(), 2);

      thing.save(function(err, savedThing) {
        if (err) throw err;

        savedThing.getMytems(function(err, items) {
          if (err) throw err;
          test.equal(items.length, 0);

          test.done();
        });
      });
    });
  },
  'test removing a thing we just added to item and which isNew': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing'),
        item  = Item.create({ name: 'an item' }),
        item2 = Item.create({ name: 'an item too' }),
        thing = Thing.create({ name: 'a thing' });

    thing.addMytem(item, item2);
    test.equal(thing.mytems.length, 2);
    test.equal(thing.countAddedAssociations('Mytem'), 2);
    thing.removeMytem(item2);
    test.equal(thing.mytems.length, 1);
    test.equal(thing.countMytemsToRemove(), 0, 'we removed only just added items');

    test.done();
  },
  'test removing one thing by id from item we loaded': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing');

    Thing.find(3, function(err, thing) {
      if (err) throw err;
      test.equal(thing.countAllMytems(), 2);
      thing.removeMytem(1);
      test.equal(thing.countAllMytems(), 1);
      test.equal(thing.countMytemsToRemove(), 1);

      thing.save(function(err, savedThing) {
        if (err) throw err;
        test.equal(thing.countMytemsToRemove(), 0);

        Thing.find(3, function(err, reloadedThing) {
          if (err) throw err;
          test.equal(reloadedThing.countAllMytems(), 1);

          reloadedThing.getMytems(function(err, items) {
            if (err) throw err;
            test.equal(items.length, 1);
            test.equal(reloadedThing.mytems.length, 1);

            test.done();
          });
        });
      });
    });
  },
  'test record gets not dirty if removing an non existent hasMany association': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing'),
        item  = Item.create({ name: 'bla' });

    Thing.find(3, function(err, thing) {
      if (err) throw err;
      test.equal(thing.isDirty, false);
      thing.removeMytem(5);
      test.equal(thing.isDirty, false);
      thing.removeMytem(item);
      test.equal(thing.isDirty, false);

      Item.find(3, function(err, item) {
        if (err) throw err;
        thing.removeMytem(item);
        test.equal(thing.isDirty, false);

        test.done();
      });
    });
  }
};

module.exports['model'] = jaz.Object.extend({}, modelTests);
module.exports['model'].setUp = setup('object');

module.exports['model with late defined assoc'] = jaz.Object.extend({}, modelTests);
module.exports['model with late defined assoc'].setUp = setup('late defined');

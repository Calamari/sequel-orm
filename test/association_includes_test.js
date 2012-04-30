var Seq         = require(__dirname + '/..'),
    jaz         = require('jaz-toolkit'),
    mysql       = require('mysql'),
    TEST_CONFIG = require(__dirname + '/test_config'),
    client      = mysql.createClient(TEST_CONFIG);

//THINK: Maybe addHasOneColumn adding a column to the database might not be the best of ideas

var generateTestData = function(db, thingsDef, itemsDef, objsDef, cb) {
  db.createTable('things', thingsDef, function() {
    db.createTable('items', itemsDef, function() {
      db.createTable('objs', objsDef, function() {
        var valuesThings = [],
            valuesItems = [],
            valuesObjs = [],
            things = [],
            items  = [],
            objs   = [];
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
        items.push([ 3, 'Air', 2 ]);
        valuesObjs.push('(?,?,?)');
        objs.push([ 1, 'Foo', 3 ]);

        client.query("INSERT INTO things (`id`, `name`) VALUES " + valuesThings.join(','), jaz.Array.flatten(things), function(err) {
          if (err) throw err;
          client.query("INSERT INTO items (`id`, `name`, `thing_id`) VALUES " + valuesItems.join(','), jaz.Array.flatten(items), function(err) {
            if (err) throw err;
            client.query("INSERT INTO objs (`id`, `name`, `thing_id`) VALUES " + valuesObjs.join(','), jaz.Array.flatten(objs), function(err) {
              if (err) throw err;
              cb();
            });
          });
        });
      });
    });
  });
};

module.exports = {
  setUp: function(cb) {
    var db  = Seq.createIfNotExistent(TEST_CONFIG);
    this.db = db;
    client.query("DROP TABLE things, items, objs;", function() {
      var thingsDef = function(table) {
            table.addColumn('name', Seq.dataTypes.VARCHAR());
          },
          itemsDef = function(table) {
            table.addColumn('name', Seq.dataTypes.VARCHAR());
            table.addBelongsToColumn('thing');
          },
          objsDef = function(table) {
            table.addColumn('name', Seq.dataTypes.VARCHAR());
            table.addBelongsToColumn('thing');
          };

      Seq.clearTableDefinitions();
      Seq.createTable('things', thingsDef);
      Seq.createTable('items', itemsDef);
      Seq.createTable('objs', objsDef);
      var Thing = Seq.defineModel('Thing', Seq.getTableFromMigration('things'));
      var Item  = Seq.defineModel('Item', Seq.getTableFromMigration('items'));
      var Obj   = Seq.defineModel('Objs', Seq.getTableFromMigration('objs'));
      Item.belongsTo(Thing);
      Thing.hasMany(Item);
      Thing.hasMany(Obj, { name: 'DifferentThing' });

      generateTestData(db, thingsDef, itemsDef, objsDef, cb);
    });
  },
  tearDown: function(cb) {
    Seq.removeAllListeners('log');
    cb();
  },
  'test loading item that has no associated item makes only one db call': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing'),
        count = 0;

    Seq.on('log', function() { ++count; });

    Thing.find({ where: 'things.id=1', include: ['items'] }, function(err, thing) {
      if (err) throw err;
      test.equal(count, 1);

      test.done();
    });
  },
  'test loading item that has one associated item makes two db calls': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing'),
        count = 0;

    Seq.on('log', function() { ++count; });

    Thing.find({ where: 'things.id=2', include: ['items'] }, function(err, thing) {
      if (err) throw err;
      test.equal(count, 2);

      test.done();
    });
  },
  'test loading item that has two associated table makes three db calls': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing'),
        count = 0;

    Seq.on('log', function() { ++count; });

    Thing.find({ where: 'things.id=3', include: ['items', 'differentThings'] }, function(err, thing) {
      if (err) throw err;
      test.equal(count, 3);

      test.done();
    });
  },
  'test loading item that has two associated table but only one with items make two db calls': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing'),
        count = 0;

    Seq.on('log', function() { ++count; });

    Thing.find({ where: 'things.id=2', include: ['items', 'differentThings'] }, function(err, thing) {
      if (err) throw err;
      test.equal(count, 2);

      test.done();
    });
  },
  'test included item are already loaded': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing');

    Thing.find({ where: 'things.id=2', include: ['items'] }, function(err, thing) {
      if (err) throw err;
      test.equal(thing.items.length, 1);

      test.done();
    });
  },
  'test included item can easily be accessed': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing');

    Thing.find({ where: 'things.id=2', include: ['items'] }, function(err, thing) {
      if (err) throw err;
      test.equal(thing.items[0].name, 'Air');

      test.done();
    });
  },
  'test loading item and then loading the associated items do no more db calls': function(test) {
    var Item  = Seq.getModel('Item'),
        Thing = Seq.getModel('Thing'),
        count = 0;

    Seq.on('log', function() { ++count; });

    Thing.find({ where: 'things.id=3', include: ['items'] }, function(err, thing) {
      if (err) throw err;

      thing.getItems(function(err, items) {
        if (err) throw err;
        test.equal(count, 2);
        test.equal(items.length, 2);

        test.done();
      });
    });
  }
};

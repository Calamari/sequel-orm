var Seq         = require(__dirname + '/..'),
    jaz         = require('jaz-toolkit'),
    mysql       = require('mysql'),
    TEST_CONFIG = require(__dirname + '/test_config'),
    client      = mysql.createClient(TEST_CONFIG);

module.exports = {
  setUp: function(cb) {
    var db  = Seq.create(TEST_CONFIG);
    this.db = db;
    client.query("DROP TABLE items;", function() {
      var tableDef = function(table) {
        table.addColumn('name', Seq.dataTypes.VARCHAR());
        table.addColumn('price', Seq.dataTypes.INT({ required: true }));
        table.addTimestamps();
      };
      Seq.createTable('items', tableDef);
      db.createTable('items', tableDef, function() {
        cb();
      });
    });
  },
  'test afterCreate hook is fired and has right this scope and arguments': function(test) {
    test.expect(2);
    var item,
        Item = Seq.defineModel('Item', Seq.getTableFromMigration('items'), {
          hooks: {
            afterCreate: function(data) {
              test.equal(this.class, 'ItemModel');
              test.equal(data.name, 'Bob');
            },
            afterLoad: function(data) {
              test.ok(false);
            }
          }
        });
    item = Item.create({ name: 'Bob' });
    test.done();
  },
  'test beforeChange hook is fired on changing not on creating and has right this scope and arguments': function(test) {
    test.expect(4);
    var item,
        Item = Seq.defineModel('Item', Seq.getTableFromMigration('items'), {
          hooks: {
            beforeChange: function(key, value) {
              test.equal(this.class, 'ItemModel');
              test.equal(this.name, 'Bob');
              test.equal(key, 'name');
              test.equal(value, 'Tim');
            }
          }
        });
    item = Item.create({ name: 'Bob' });
    item.name = 'Tim';
    test.done();
  },
  'test afterChange hook is fired on changing not on creating and has right this scope and arguments': function(test) {
    test.expect(5);
    var item,
        Item = Seq.defineModel('Item', Seq.getTableFromMigration('items'), {
          hooks: {
            afterChange: function(key, value) {
              test.equal(this.class, 'ItemModel');
              test.equal(this.name, 'Tim');
              test.equal(this.isDirty, true);
              test.equal(key, 'name');
              test.equal(value, 'Tim');
            }
          }
        });
    item = Item.create({ name: 'Bob' });
    item.name = 'Tim';
    test.done();
  },
  'test afterChange hook is not fired when setting setting element through special setter function': function(test) {
    test.expect(3);
    var next = 1,
        item,
        Item = Seq.defineModel('Item', Seq.getTableFromMigration('items'), {
          hooks: {
            afterChange: function(key, value) {
              test.equal(next++, 1);
              test.equal(this.class, 'ItemModel');
              this.setAttribute('name', this.name + 'my');
            }
          }
        });
    item = Item.create({ name: 'Bob' });
    item.name = 'Tim';
    test.equal(item.name, 'Timmy');
    test.done();
  },
  'test beforeValidate hook is fired and has right this scope and arguments': function(test) {
    test.expect(4);
    var item,
        Item = Seq.defineModel('Item', Seq.getTableFromMigration('items'), {
          hooks: {
            beforeValidate: function() {
              test.equal(this.class, 'ItemModel');
              test.equal(this.name, 'Bob');
              test.equal(arguments.length, 0);
              test.equal(this.errors.length, 0, 'before validation should be no errors');
            }
          }
        });
    item = Item.create({ name: 'Bob' });
    item.validate();
    test.done();
  },
  'test afterValidate hook is fired and has right this scope and arguments': function(test) {
    test.expect(5);
    var item,
        Item = Seq.defineModel('Item', Seq.getTableFromMigration('items'), {
          hooks: {
            afterValidate: function(isValidated) {
              test.equal(this.class, 'ItemModel');
              test.equal(this.name, 'Bob');
              test.equal(isValidated, false);
              test.equal(this.errors.length, 1);
              test.ok(this.errors['price']);
            }
          }
        });
    item = Item.create({ name: 'Bob' });
    item.validate();
    test.done();
  },
  'test beforeSave hook is fired and has right this scope and arguments': function(test) {
    test.expect(3);
    var item,
        Item = Seq.defineModel('Item', Seq.getTableFromMigration('items'), {
          hooks: {
            beforeSave: function() {
              test.equal(this.class, 'ItemModel');
              test.equal(this.name, 'Bob');
              test.equal(this.price, 23);
            }
          }
        });
    item = Item.create({ name: 'Bob', price: 23 });
    item.save(function(err) {
      if (err) throw err;
      test.done();
    });
  },
  'test beforeSave hook is not fired if item did not validate': function(test) {
    test.expect(0);
    var item,
        Item = Seq.defineModel('Item', Seq.getTableFromMigration('items'), {
          hooks: {
            beforeSave: function() {
              test.ok(false);
            }
          }
        });
    item = Item.create({ name: 'Bob' });
    item.save(function(err) {
      test.done();
    });
  },
  'test afterSave hook is fired and has right this scope and arguments': function(test) {
    test.expect(7);
    var next = 1,
        Item = Seq.defineModel('Item', Seq.getTableFromMigration('items'), {
          hooks: {
            afterSave: function() {
              test.equal(next++, 1, "this should be called before save callback");
              test.equal(this.class, 'ItemModel');
              test.equal(this.name, 'Bob');
              test.equal(this.isNew, false);
              test.equal(this.isDirty, false);
              test.equal(arguments.length, 0);
            }
          }
        }),
        item = Item.create({ name: 'Bob', price: 2 });
    item.save(function(err) {
      if (err) throw err;
      test.equal(next++, 2, "this should be called after the afterSave callback");
      test.done();
    });
  },
  'test afterLoad hook is fired and has right this scope and arguments': function(test) {
    test.expect(9);
    var item,
        next = 1,
        Item = Seq.defineModel('Item', Seq.getTableFromMigration('items'), {
          hooks: {
            afterCreate: function() {
              test.equal(next, 1, "that should only be called once at create");
            },
            afterLoad: function(data) {
              test.equal(next++, 2);
              test.equal(this.class, 'ItemModel');
              test.equal(this.name, 'Bill');
              test.equal(this.isNew, false);
              test.equal(this.isDirty, false);
              test.equal(data.name, 'Bill');
              test.equal(data.price, 21);
            }
          }
        });
    item = Item.create({ name: 'Bill', price: 21 });
    item.save(function(err) {
      if (err) throw err;
      test.equal(next++, 1, "this should be called before callback");
      Item.find(item.id, function(err) {
        if (err) throw err;
        setTimeout(function() {
          test.done();
        }, 0);
      });
    });
  }
};

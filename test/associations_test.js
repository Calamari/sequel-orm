var Seq         = require(__dirname + '/..'),
    jaz         = require('jaz-toolkit'),
    mysql       = require('mysql'),
    TEST_CONFIG = require(__dirname + '/test_config'),
    client      = mysql.createClient(TEST_CONFIG);

//THINK: Maybe addHasOneColumn adding a column to the database might not be the best of ideas

module.exports['has one'] = {
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
          table.addHasOneColumn('thing', 'object');
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
            table.addHasOneColumn('thing', 'object');
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
              table.addHasOneColumn('thing', 'object');
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
            table.addHasOneColumn('thing', 'object');
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

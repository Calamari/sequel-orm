var Seq         = require(__dirname + '/..'),
    jaz         = require('jaz-toolkit'),
    mysql       = require('mysql'),
    TEST_CONFIG = require(__dirname + '/test_config'),
    client      = mysql.createClient(TEST_CONFIG);

//THINK: Maybe addHasOneColumn adding a column to the database might not be the best of ideas

module.exports['migration'] = {
  setUp: function(cb) {
    var db  = Seq.create(TEST_CONFIG);
    this.db = db;
    client.query("DROP TABLE items, things, item_to_things;", function() {
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
    this.db.createHasManyAssociationTable('item', 'things', function(err) {
      if (err) throw err;
      client.query("DESCRIBE item_to_things;", function(err, result) {
        if (err) throw err;
        // at some point we have to remove id column
        test.equal(result.length, 3, 'We should have a table with two fields and an id');
        test.equal(result[1].Field, 'item_id');
        test.equal(result[1].Key, 'MUL');
        test.equal(result[1].Extra, '');
        test.equal(result[1].Type, 'int(11)');
        test.equal(result[2].Field, 'things_id');
        test.equal(result[2].Key, '');
        test.equal(result[2].Extra, '');
        test.equal(result[2].Type, 'int(11)');
        test.done();
      });
    });
  },
  'test removing an association table': function(test) {
    var db = this.db;
    db.createHasManyAssociationTable('item', 'things', function(err) {
      if (err) throw err;
      db.dropHasManyAssociationTable('item', 'things', function(err) {
        if (err) throw err;
        client.query("DESCRIBE item_to_things;", function(err, result) {
          test.ok(err);
          test.done();
        });
      });
    });
  }
};

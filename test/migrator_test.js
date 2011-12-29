var Seq         = require(__dirname + '/..'),
    jaz         = require('jaz-toolkit'),
    mysql       = require('mysql'),
    TEST_CONFIG = require(__dirname + '/test_config'),
    client      = mysql.createClient(TEST_CONFIG);

module.exports.tableDefinition = {
  setUp: function(cb) {
    Seq.clearTableDefinitions();
    Seq.createTable('products', function(table) {
      table.addColumn('title', Seq.dataTypes.VARCHAR({ unique: true }));
      table.addColumn('text', Seq.dataTypes.TEXT());
      table.addColumn('size', Seq.dataTypes.INT({ length: 5 }));
      table.addTimestamps();
    });
    cb();
  },
  'test getting table defintion from migration works': function(test) {
    var ProductTable = Seq.getTableFromMigration('Product');
    test.ok(ProductTable.id.equals(Seq.dataTypes.INT())); // hmm, should be changed to autoincrement stuff...
    test.ok(ProductTable.title.equals(Seq.dataTypes.VARCHAR({ unique: true })));
    test.ok(ProductTable.text.equals(Seq.dataTypes.TEXT()));
    test.ok(ProductTable.size.equals(Seq.dataTypes.INT({ length: 5 })));
    test.ok(ProductTable.createdAt.equals(Seq.dataTypes.DATETIME()));
    test.ok(ProductTable.updatedAt.equals(Seq.dataTypes.DATETIME()));
    test.done();
  },
  'test getting table definition with updated table': function(test) {
    Seq.updateTable('products', function(table) {
      table.changeColumn('title', 'title', Seq.dataTypes.VARCHAR({ length: 30 }));
      table.removeColumn('text', Seq.dataTypes.TEXT());
    });
    var ProductTable = Seq.getTableFromMigration('Product');
    test.ok(ProductTable.id.equals(Seq.dataTypes.INT())); // hmm, should be changed to autoincrement stuff...
    test.ok(ProductTable.title.equals(Seq.dataTypes.VARCHAR({ length: 30 })));
    test.ok(ProductTable.size.equals(Seq.dataTypes.INT({ length: 5 })));
    test.ok(ProductTable.createdAt.equals(Seq.dataTypes.DATETIME()));
    test.ok(ProductTable.updatedAt.equals(Seq.dataTypes.DATETIME()));
    test.done();    
  },
  'test we can clear all table definitions': function(test) {
    Seq.clearTableDefinitions();
    test.ok(!Seq.getTableFromMigration('Product'));
    test.done();
  },
  'test delete table and definition is still available': function(test) {
    
    test.done();
  },
  'test sync migrations': function(test) {
    
    test.done();
  }
}

/**
 TODOs:
  changeColumn only with two params, instead of three
  table and model names should be possible
 
*/
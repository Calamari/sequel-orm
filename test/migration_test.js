var Seq = require(__dirname + '/..'),
    mysql = require('mysql'),
    TEST_CONFIG = require(__dirname + '/test_config'),
    client = mysql.createClient(TEST_CONFIG);

module.exports = {
  setUp: function(cb) {
    this.db = Seq.create(TEST_CONFIG);
    cb();
  },
  tearDown: function(cb) {
    client.query("DROP TABLE products;", function() { cb(); });
  },
  'test creating a table': function(test) {
    this.db.createTable('products', function(err) {
      if (err) throw err;
      client.query("DESCRIBE products;", function(err, result) {
        if (err) throw err;
        // if no error table exists
        test.done();
      });
    });
  },
  'test creating a table automatically adds an id field': function(test) {
    this.db.createTable('products', function(err) {
      if (err) throw err;
      client.query("DESCRIBE products;", function(err, result) {
        if (err) throw err;
        test.equal(result.length, 1, 'We should have a table with only one field');
        test.equal(result[0].Field, 'id');
        test.equal(result[0].Key, 'PRI');
        test.equal(result[0].Extra, 'auto_increment');
        test.equal(result[0].Type, 'int(11)');
        test.done();
      });
    });
  },
  'test adding column without valid data type returns error': function(test) {
    this.db.createTable('products', function(table) {
      table.addColumn('foo', 'VARCHAR(11)');
    }, function(err) {
      test.equal(err.constructor, Seq.errors.NotADataTypeError, "Error should be of Type NotADataTypeError");
      test.done();
    });
  },
  'test adding columns to a table': function(test) {
    this.db.createTable('products', function(table) {
      table.addColumn('foo', Seq.dataTypes.VARCHAR());
      table.addColumn('my_time', Seq.dataTypes.DATETIME());
      table.addColumn('myint', Seq.dataTypes.INT());
      table.addColumn('floating', Seq.dataTypes.FLOAT());
      table.addColumn('sure', Seq.dataTypes.BOOLEAN());
      table.addColumn('text', Seq.dataTypes.TEXT());
    }, function(err) {
      if (err) throw err;
      client.query("DESCRIBE products;", function(err, result) {
        if (err) throw err;
        test.equal(result.length, 7, 'We should have a table with all seven fields');
        test.done();
      });
    });
  },
  'test adding a VARCHAR column without arguments': function(test) {
    this.db.createTable('products', function(table) {
      table.addColumn('foo', Seq.dataTypes.VARCHAR());
    }, function(err) {
      if (err) throw err;
      client.query("DESCRIBE products;", function(err, result) {
        if (err) throw err;
        test.equal(result.length, 2, 'We should have a table with only one field');
        test.equal(result[1].Field, 'foo');
        test.equal(result[1].Key, '');
        test.equal(result[1].Extra, '');
        test.equal(result[1].Type, 'varchar(255)');
        test.done();
      });
    });
  },
  'test adding a VARCHAR column with overriding length': function(test) {
    this.db.createTable('products', function(table) {
      table.addColumn('foo', Seq.dataTypes.VARCHAR({ length: 32 }));
    }, function(err) {
      if (err) throw err;
      client.query("DESCRIBE products;", function(err, result) {
        if (err) throw err;
        test.equal(result.length, 2, 'We should have a table with only one field');
        test.equal(result[1].Field, 'foo');
        test.equal(result[1].Null, 'NO');
        test.equal(result[1].Key, '');
        test.equal(result[1].Extra, '');
        test.equal(result[1].Type, 'varchar(32)');
        test.done();
      });
    });
  },
  'test making a VARCHAR nullable': function(test) {
    this.db.createTable('products', function(table) {
      table.addColumn('foo', Seq.dataTypes.VARCHAR({ allowNull: true }));
    }, function(err) {
      if (err) throw err;
      client.query("DESCRIBE products;", function(err, result) {
        if (err) throw err;
        test.equal(result.length, 2, 'We should have a table with only one field');
        test.equal(result[1].Field, 'foo');
        test.equal(result[1].Null, 'YES');
        test.equal(result[1].Key, '');
        test.equal(result[1].Extra, '');
        test.equal(result[1].Type, 'varchar(255)');
        test.done();
      });
    });
  }
};

var Seq = require(__dirname + '/..'),
    mysql = require('mysql'),
    TEST_CONFIG = require(__dirname + '/test_config');
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
  }
};

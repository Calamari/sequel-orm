var Seq = require(__dirname + '/..'),
    mysql = require('mysql'),
    TEST_CONFIG = require(__dirname + '/test_config');
    client = mysql.createClient(TEST_CONFIG);

module.exports = {
  tearDown: function(cb) {
    client.query("DROP TABLE test;", function() { cb(); });
  },
  'test creating a connection object without parameters throws': function(test) {
    test.throws(function() {
      Seq.create();
    }, Seq.errors.MissingArgumentsError);
    test.done();
  },
  'test creating a connection object': function(test) {
    var instance = Seq.create(TEST_CONFIG);
    test.equal(typeof instance, 'object', 'we created an object');
    test.done();
  },
  'test creating connector does not open the connection immediately': function(test) {
    var instance = Seq.create(TEST_CONFIG);
    test.ok(!instance.isConnected, 'should not connect until first sql goes out');
    test.done();
  },
  'test executing sql works': function(test) {
    var instance = Seq.create(TEST_CONFIG);
    instance.query('CREATE TABLE test (`foo` TEXT NOT NULL);', function(err, info) {
      if (err) throw err;
      client.query('DESCRIBE test;', function(err, result) {
        if (err) throw err;
        test.equal(result.length, 1, 'We should have a table with only one field');
        test.equal(result[0].Field, 'foo')
        test.done();
      })
    });
  },
  'test first execution of sql starts a connection': function(test) {
    var instance = Seq.create(TEST_CONFIG);
    instance.query('SELECT id FROM dummy;', function(err, info) {
      test.ok(instance.isConnected, 'we should be connected by now');
      test.done();
    });
  }
};

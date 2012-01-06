var Seq = require(__dirname + '/..'),
    mysql = require('mysql'),
    TEST_CONFIG = require(__dirname + '/test_config');
    client = mysql.createClient(TEST_CONFIG);

module.exports['SequelORM logging'] = {
  setUp: function(cb) {
    Seq.removeConnection();
    cb();
  },
  tearDown: function(cb) {
    Seq.removeAllListeners('log');
    cb();
  },
  'test connection defined': function(test) {
    test.expect(2);
    Seq.on('log', function(status, message) {
      test.equal(status, Seq.LOG_LEVEL_INFO);
      test.equal(message, "Connection defined to database 'sequel_orm_test' on 127.0.0.1:3306");
    });
    var db = Seq.create(TEST_CONFIG);
    test.done();
  }
};

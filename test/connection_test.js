var Seq = require(__dirname + '/..'),
    TEST_CONFIG = require(__dirname + '/test_config');

module.exports = {
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
  }
};

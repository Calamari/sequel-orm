var Seq         = require(__dirname + '/..'),
    jaz         = require('jaz-toolkit'),
    mysql       = require('mysql'),
    TEST_CONFIG = require(__dirname + '/test_config'),
    client      = mysql.createClient(TEST_CONFIG);

module.exports = {
  setUp: function(cb) {
    this.RequireItem = Seq.defineModel('Item', {
      must: Seq.dataTypes.VARCHAR({ required: true }),
      maybe: Seq.dataTypes.VARCHAR()
    });
    cb();
  },
  'test validate method will be fired': function(test) {
    Seq.removeConnection();
    var Item = Seq.defineModel('Item', {
      name: Seq.dataTypes.VARCHAR()
    });
    test.equal(typeof Item.create().validate, 'function');
    test.done();
  },
  'test required columns will fire if not set': function(test) {
    var item = this.RequireItem.create();
    test.equal(item.validate(), false);
    test.equal(item.errors.length, 1);
    test.equal(item.errors[0].column, 'must');
    test.equal(item.errors[0].type, 'required');
    test.done();
  },
  'test required columns will fire if only not required columns are set': function(test) {
    var item = this.RequireItem.create({ maybe: "content" });
    test.equal(item.validate(), false);
    test.equal(item.errors.length, 1);
    test.equal(item.errors[0].column, 'must');
    test.equal(item.errors[0].type, 'required');
    test.done();
  },
  'test required columns will not fire if set': function(test) {
    var item = this.RequireItem.create({ must: "so be it!" });
    test.equal(item.validate(), true);
    test.equal(item.errors.length, 0);
    test.done();
  }
};

var vows = require('vows'),
  assert = require('assert'),
  jaz = require('../src/jaz');


//module.exports =
vows.describe('Date')
.addBatch({
  'Jaz.Date has': {
    topic: jaz.Date,

    'toMySQLString': function(JazDate) {
      var now      = new Date(2011, 10, 20, 2, 2, 3),
          mysqlNow = JazDate.toMySQLString(now);

      assert.equal(mysqlNow, now.toISOString().replace('T', ' ').split('.')[0]);
    },

    'fromMySQLString': function(JazDate) {
      var now      = new Date(2011, 10, 20, 2, 2, 3),
          mysqlNow = JazDate.toMySQLString(now);

      assert.equal(JazDate.fromMySQLString(mysqlNow).constructor, Date);
      assert.equal(JazDate.fromMySQLString(mysqlNow).getTimezoneOffset(), now.getTimezoneOffset());
    }
  }
}).export(module);

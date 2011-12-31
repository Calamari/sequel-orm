var Seq         = require(__dirname + '/..'),
    jaz         = require('jaz-toolkit'),
    mysql       = require('mysql'),
    TEST_CONFIG = require(__dirname + '/test_config'),
    client      = mysql.createClient(TEST_CONFIG);

module.exports = {
  setUp: function(cb) {
    Seq.removeConnection();
    this.RequireItem = Seq.defineModel('Item', {
      must: Seq.dataTypes.VARCHAR({ required: true }),
      maybe: Seq.dataTypes.VARCHAR()
    });
    cb();
  },
  'test validate method will be fired': function(test) {
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
module.exports['default validations'] = {
  'test that not used if empty': function(test) {
    var Item = Seq.defineModel('Item', {
      myInt: Seq.dataTypes.INT()
    });
    var item = Item.create();
    test.equal(item.validate(), true);
    test.done();
  },
  INT: {
    setUp: function(cb) {
      this.Item = Seq.defineModel('Item', {
        myInt: Seq.dataTypes.INT()
      });
      cb();
    },
    'test is correct': function(test) {
      var item = this.Item.create({ myInt: 4 });
      test.equal(item.validate(), true);
      test.done();
    },
    'test is string': function(test) {
      var item = this.Item.create({ myInt: "bla" });
      test.equal(item.validate(), false);
      test.equal(item.errors.length, 1);
      test.equal(item.errors[0].column, 'myInt');
      test.equal(item.errors[0].type, 'default');
      test.done();
    },
    'test is float': function(test) {
      var item = this.Item.create({ myInt: "bla" });
      test.equal(item.validate(), false);
      test.equal(item.errors.length, 1);
      test.equal(item.errors[0].column, 'myInt');
      test.equal(item.errors[0].type, 'default');
      test.done();
    }
  },
  FLOAT: {
    setUp: function(cb) {
      this.Item = Seq.defineModel('Item', {
        num: Seq.dataTypes.FLOAT()
      });
      cb();
    },
    'test is correct (int)': function(test) {
      var item = this.Item.create({ num: 4 });
      test.equal(item.validate(), true);
      test.done();
    },
    'test is correct (flaot)': function(test) {
      var item = this.Item.create({ num: 23424.32 });
      test.equal(item.validate(), true);
      test.done();
    },
    'test is string': function(test) {
      var item = this.Item.create({ num: "bla" });
      test.equal(item.validate(), false);
      test.equal(item.errors.length, 1);
      test.equal(item.errors[0].column, 'num');
      test.equal(item.errors[0].type, 'default');
      test.done();
    },
    'test is boolean': function(test) {
      var item = this.Item.create({ num: true });
      test.equal(item.validate(), false);
      test.equal(item.errors.length, 1);
      test.equal(item.errors[0].column, 'num');
      test.equal(item.errors[0].type, 'default');
      test.done();
    }
  },
  VARCHAR: {
    setUp: function(cb) {
      this.Item = Seq.defineModel('Item', {
        varchar: Seq.dataTypes.VARCHAR()
      });
      cb();
    },
    'test is correct': function(test) {
      var item = this.Item.create({ varchar: "faerferfr" });
      test.equal(item.validate(), true);
      test.done();
    },
    'test is number': function(test) {
      var item = this.Item.create({ varchar: 42.23 });
      test.equal(item.validate(), false);
      test.equal(item.errors.length, 1);
      test.equal(item.errors[0].column, 'varchar');
      test.equal(item.errors[0].type, 'default');
      test.done();
    },
    'test is object': function(test) {
      var item = this.Item.create({ varchar: { text: 'foo' } });
      test.equal(item.validate(), false);
      test.equal(item.errors.length, 1);
      test.equal(item.errors[0].column, 'varchar');
      test.equal(item.errors[0].type, 'default');
      test.done();
    }
  },
  TEXT: {
    setUp: function(cb) {
      this.Item = Seq.defineModel('Item', {
        text: Seq.dataTypes.TEXT()
      });
      cb();
    },
    'test is correct': function(test) {
      var item = this.Item.create({ text: "faerferfr" });
      test.equal(item.validate(), true);
      test.done();
    },
    'test is number': function(test) {
      var item = this.Item.create({ text: 42.23 });
      test.equal(item.validate(), false);
      test.equal(item.errors.length, 1);
      test.equal(item.errors[0].column, 'text');
      test.equal(item.errors[0].type, 'default');
      test.done();
    },
    'test is array': function(test) {
      var item = this.Item.create({ text: [ 'foobar' ] });
      test.equal(item.validate(), false);
      test.equal(item.errors.length, 1);
      test.equal(item.errors[0].column, 'text');
      test.equal(item.errors[0].type, 'default');
      test.done();
    }
  },
  BOOLEAN: {
    setUp: function(cb) {
      this.Item = Seq.defineModel('Item', {
        bool: Seq.dataTypes.BOOLEAN()
      });
      cb();
    },
    'test is correct (true)': function(test) {
      var item = this.Item.create({ bool: true });
      test.equal(item.validate(), true);
      test.done();
    },
    'test is correct (false)': function(test) {
      var item = this.Item.create({ bool: false });
      test.equal(item.validate(), true);
      test.done();
    },
    'test is number': function(test) {
      var item = this.Item.create({ bool: 1 });
      test.equal(item.validate(), false);
      test.equal(item.errors.length, 1);
      test.equal(item.errors[0].column, 'bool');
      test.equal(item.errors[0].type, 'default');
      test.done();
    },
    'test is object': function(test) {
      var item = this.Item.create({ bool: {} });
      test.equal(item.validate(), false);
      test.equal(item.errors.length, 1);
      test.equal(item.errors[0].column, 'bool');
      test.equal(item.errors[0].type, 'default');
      test.done();
    },
    'test is string': function(test) {
      var item = this.Item.create({ bool: 'NO' });
      test.equal(item.validate(), false);
      test.equal(item.errors.length, 1);
      test.equal(item.errors[0].column, 'bool');
      test.equal(item.errors[0].type, 'default');
      test.done();
    },
    'test is empty string': function(test) {
      var item = this.Item.create({ bool: '' });
      test.equal(item.validate(), false);
      test.equal(item.errors.length, 1);
      test.equal(item.errors[0].column, 'bool');
      test.equal(item.errors[0].type, 'default');
      test.done();
    }
  },
  DATETIME: {
    setUp: function(cb) {
      this.Item = Seq.defineModel('Item', {
        date: Seq.dataTypes.DATETIME()
      });
      cb();
    },
    'test is correct': function(test) {
      var item = this.Item.create({ date: new Date() });
      test.equal(item.validate(), true);
      test.done();
    },
    'test is number': function(test) {
      var item = this.Item.create({ date: new Date().getTime() });
      test.equal(item.validate(), false);
      test.equal(item.errors.length, 1);
      test.equal(item.errors[0].column, 'date');
      test.equal(item.errors[0].type, 'default');
      test.done();
    },
    'test is another object': function(test) {
      var item = this.Item.create({ date: { time: 13345 } });
      test.equal(item.validate(), false);
      test.equal(item.errors.length, 1);
      test.equal(item.errors[0].column, 'date');
      test.equal(item.errors[0].type, 'default');
      test.done();
    }
  }
};

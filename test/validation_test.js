var Seq         = require(__dirname + '/..'),
    jaz         = require('jaz-toolkit'),
    mysql       = require('mysql'),
    TEST_CONFIG = require(__dirname + '/test_config'),
    client      = mysql.createClient(TEST_CONFIG);

module.exports['basics'] = {
  'test validate method will be fired': function(test) {
    var Item = Seq.defineModel('Item', {
      name: Seq.dataTypes.VARCHAR()
    });
    test.equal(typeof Item.create().validate, 'function');
    test.done();
  }
};

module.exports['required'] = {
  setUp: function(cb) {
    Seq.removeConnection();
    this.RequireItem = Seq.defineModel('Item', {
      must: Seq.dataTypes.VARCHAR({ required: true }),
      maybe: Seq.dataTypes.VARCHAR()
    });
    cb();
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
      var item = this.Item.create({ myInt: 44.8 });
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

var emailValidator = function(val) {
  return val.indexOf('@') !== -1;
};

module.exports['custom validations'] = {
  'test if custom validator is used and marked as custom': function(test) {
    Seq.clearTableDefinitions();
    var Item = Seq.defineModel('Item', {
      pseudoEmail: Seq.dataTypes.VARCHAR({ validation: emailValidator })
    });
    var item = Item.create({ pseudoEmail: 'bla' });
    test.equal(item.validate(), false);
    test.equal(item.errors.length, 1);
    test.equal(item.errors[0].column, 'pseudoEmail');
    test.equal(item.errors[0].type, 'custom');
    item.pseudoEmail = 'bla@blubb.com';
    test.equal(item.validate(), true);
    test.equal(item.errors.length, 0);
    test.done();
  },
  'test if custom validators work together with required ': function(test) {
    var Item = Seq.defineModel('Item', {
      pseudoEmail: Seq.dataTypes.VARCHAR({ validation: emailValidator, required: true })
    });
    var item = Item.create({ pseudoEmail: '' });
    test.equal(item.validate(), false);
    test.equal(item.errors.length, 1);
    test.equal(item.errors[0].column, 'pseudoEmail');
    test.equal(item.errors[0].type, 'required');
    item.pseudoEmail = 'no email sorry';
    test.equal(item.validate(), false);
    test.equal(item.errors.length, 1);
    test.equal(item.errors[0].column, 'pseudoEmail');
    test.equal(item.errors[0].type, 'custom');
    test.done();
  },
  'test more validators as custom ones': function(test) {
    var Item = Seq.defineModel('Item', {
      text: Seq.dataTypes.VARCHAR({ validation: {
        one: function(val) { return val === 'one'; },
        isO: function(val) { return val.indexOf('o') === 0; }
      } })
    });
    var item = Item.create({ text: '' });
    test.equal(item.validate(), true);
    test.equal(item.errors.length, 0);

    item.text = 'two';
    test.equal(item.validate(), false);
    test.equal(item.errors.length, 2);
    test.equal(item.errors[0].column, 'text');
    test.equal(item.errors[0].type, 'one');
    test.equal(item.errors[1].column, 'text');
    test.equal(item.errors[1].type, 'isO');
    test.equal(item.errors['text'].length, 2);
    test.equal(item.errors['text'][0], 'one');
    test.equal(item.errors['text'][0], 'isO');

    item.text = 'o';
    test.equal(item.validate(), false);
    test.equal(item.errors.length, 1);
    test.equal(item.errors[0].column, 'text');
    test.equal(item.errors[0].type, 'one');

    item.text = 'one';
    test.equal(item.validate(), true);
    test.equal(item.errors.length, 0);

    test.done();
  },
  'test more validators as custom ones': function(test) {
    var Item = Seq.defineModel('Item', {
      text: Seq.dataTypes.VARCHAR({ validation: {
        one: function(val) { return val === 'one'; },
        isO: function(val) { return val.indexOf('o') === 0; }
      } })
    });
    var item = Item.create({ text: 'two' });
    test.equal(item.validate(), false);
    test.equal(item.errors.length, 2);
    test.equal(item.errors['text'].length, 2);
    test.equal(item.errors['text'][0], 'one');
    test.equal(item.errors['text'][1], 'isO');

    item.text = 'o';
    test.equal(item.validate(), false);
    test.equal(item.errors.length, 1);
    test.equal(item.errors['text'].length, 1);
    test.equal(item.errors['text'][0], 'one');

    test.done();
  },
  'test error is thrown if no function is given as validator': function(test) {
    test.throws(function() {
      var Item = Seq.defineModel('Item', {
        text: Seq.dataTypes.VARCHAR({ validation: true })
      });
    }, Seq.errors.NotAValidatorError);
    test.done();
  },
  'test error is thrown if one of the elements given as validators is not a function': function(test) {
    test.throws(function() {
      var Item = Seq.defineModel('Item', {
        text: Seq.dataTypes.VARCHAR({ validation: { test: function() {}, bla: true } })
      });
    }, Seq.errors.NotAValidatorError);
    test.done();
  }
};

module.exports['later added validations'] = {
  setUp: function(cb) {
    Seq.createTable('items', function(table) {
      table.addColumn('pseudoEmail', Seq.dataTypes.VARCHAR());
    });
    cb();
  },
  'test if validators can be added later': function(test) {
    var Item = Seq.defineModel('Item', Seq.getTableFromMigration('items'), {
      validations: {
        pseudoEmail: { validation: emailValidator, required: true }
      }
    });
    var item = Item.create({ pseudoEmail: '' });
    test.equal(item.validate(), false);
    test.equal(item.errors.length, 1);
    test.equal(item.errors[0].column, 'pseudoEmail');
    test.equal(item.errors[0].type, 'required');
    item.pseudoEmail = 'no email sorry';
    test.equal(item.validate(), false);
    test.equal(item.errors.length, 1);
    test.equal(item.errors[0].column, 'pseudoEmail');
    test.equal(item.errors[0].type, 'custom');
    test.done();
  },
  'test that later added validations will be checked for validty': function(test) {
    test.throws(function() {
      var Item = Seq.defineModel('Item', Seq.getTableFromMigration('items'), {
        validations: {
          pseudoEmail: { validation: { test: function() {}, bla: true } }
        }
      });
    }, Seq.errors.NotAValidatorError);
    test.done();
  }
};

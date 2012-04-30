var Seq         = require(__dirname + '/..'),
    jaz         = require('jaz-toolkit'),
    mysql       = require('mysql'),
    TEST_CONFIG = require(__dirname + '/test_config'),
    client      = mysql.createClient(TEST_CONFIG);

module.exports['model.find methods'] = {
  setUp: function(cb) {
    var db  = Seq.createIfNotExistent(TEST_CONFIG);
    this.db = db;
    client.query("DROP TABLE things;", function() {
      var tableDef = function(table) {
        table.addColumn('name', Seq.dataTypes.VARCHAR());
        table.addColumn('number', Seq.dataTypes.INT());
        table.addColumn('float', Seq.dataTypes.FLOAT());
        table.addColumn('time', Seq.dataTypes.DATETIME());
        table.addColumn('bool', Seq.dataTypes.BOOLEAN());
        table.addColumn('someText', Seq.dataTypes.TEXT());
        table.addTimestamps();
      };
      Seq.createTable('things', tableDef);
      Seq.defineModel('Thing', Seq.getTableFromMigration('things'));
      db.createTable('things', tableDef, function() {
        var values = [],
            params = [];
        values.push('(?,?,?,?,?,?,?)');
        params.push([ 1, 'Bill', 42, 23.3, new Date(2001, 3, 3), false, 'take me']);
        values.push('(?,?,?,?,?,?,?)');
        params.push([ 2, 'Bob', 20, 2232, new Date(2011, 12, 24), false, '']);
        values.push('(?,?,?,?,?,?,?)');
        params.push([ 3, 'Sally', 42, 0.666, new Date(1990, 5, 28), true, '']);
        values.push('(?,?,?,?,?,?,?)');
        params.push([ 4, 'Zoe', -3423, 99.9091, new Date(2000, 1, 1), true, 'I was here']);
        client.query("INSERT INTO things (`id`, `name`, `number`, `float`, `time`, `bool`, `some_text`) VALUES " + values.join(','), jaz.Array.flatten(params), function(err) {
          if (err) throw err;
          cb();
        });
      });
    });
  },
  'test find does not need a callback': function(test) {
    var Thing = Seq.getModel('Thing');
    Thing.find(3);
    test.done();
  },
  'test find with id': function(test) {
    var Thing = Seq.getModel('Thing');
    Thing.find(3, function(err, thing) {
      if (err) throw err;
      test.equal(thing.class, 'ThingModel');
      test.equal(thing.name, 'Sally');
      test.equal(thing.number, 42);
      test.equal(thing.id, 3);
      test.equal(typeof thing.id, 'number');
      test.equal(thing.bool, true);
      test.done();
    });
  },
  'test found item is not new and not dirty': function(test) {
    var Thing = Seq.getModel('Thing');
    Thing.find(3, function(err, thing) {
      if (err) throw err;
      test.equal(thing.isNew, false);
      test.equal(thing.isDirty, false);
      test.done();
    });
  },
  'test find with id (5) which does not exist': function(test) {
    var Thing = Seq.getModel('Thing');
    Thing.find(5, function(err, thing) {
      test.equal(err.constructor, Seq.errors.ItemNotFoundError);
      test.equal(thing, null);
      test.done();
    });
  },
  'test find with id (0) which does not exist': function(test) {
    var Thing = Seq.getModel('Thing');
    Thing.find(0, function(err, thing) {
      test.equal(err.constructor, Seq.errors.ItemNotFoundError);
      test.equal(thing, null);
      test.done();
    });
  },
  'test find without any search parameter should find first matching entry': function(test) {
    var Thing = Seq.getModel('Thing');
    Thing.find(function(err, thing) {
      test.equal(thing.name, 'Bill');
      test.equal(thing.number, 42);
      test.equal(thing.id, 1);
      test.equal(thing.bool, false);
      test.done();
    });
  },
  'test find with where clause': function(test) {
    var Thing = Seq.getModel('Thing');
    Thing.find({ where: "name='Zoe'" }, function(err, thing) {
      if (err) throw err;
      test.equal(thing.name, 'Zoe');
      test.equal(thing.number, -3423);
      test.equal(thing.id, 4);
      test.equal(thing.bool, true);
//      test.equal(thing.time, new Date(2000, 1, 1));
      test.done();
    });
  },
  'test find with where clause that finds nothing': function(test) {
    var Thing = Seq.getModel('Thing');
    Thing.find({ where: "name='Zo'" }, function(err, thing) {
      test.equal(err.constructor, Seq.errors.ItemNotFoundError);
      test.equal(thing, null);
      test.done();
    });
  },
  'test find with where clause containing like statement': function(test) {
    var Thing = Seq.getModel('Thing');
    Thing.find({ where: "name LIKE '%ll%'" }, function(err, thing) {
      test.equal(thing.name, 'Bill');
      test.equal(thing.number, 42);
      test.equal(thing.id, 1);
      test.equal(thing.bool, false);
      test.done();
    });
  },
  'test find with where clause and order desc': function(test) {
    var Thing = Seq.getModel('Thing');
    Thing.find({ where: "name LIKE '%ll%'", order: 'id DESC' }, function(err, thing) {
      if (err) throw err;
      test.equal(thing.name, 'Sally');
      test.equal(thing.number, 42);
      test.equal(thing.id, 3);
      test.equal(thing.bool, true);
      test.done();
    });
  },
  'test find without where clause but with order name desc': function(test) {
    var Thing = Seq.getModel('Thing');
    Thing.find({  order: 'name DESC' }, function(err, thing) {
      if (err) throw err;
      test.equal(thing.name, 'Zoe');
      test.equal(thing.id, 4);
      test.done();
    });
  },
  'test if where clause can be secured': function(test) {
    var Thing = Seq.getModel('Thing');
    // NOTE: The ? thing is only useful for use within where clauses, if used in order or limit, check
    // that you put the input params in the right order (where then order then limit)
    Thing.find({ where: "name LIKE ? AND number = ?", order: '? DESC' }, ['B%', 20, 'name'], function(err, thing) {
      if (err) throw err;
      test.equal(thing.name, 'Bob');
      test.equal(thing.number, 20);
      test.equal(thing.id, 2);
      test.done();
    });
  },
  'test findAll method returns array of results (without userParams arg)': function(test) {
    var Thing = Seq.getModel('Thing');
    Thing.findAll({  where: "name LIKE 'B%'" }, function(err, things) {
      if (err) throw err;
      test.equal(things.length, 2);
      test.equal(things[0].name, 'Bill');
      test.equal(things[0].id, 1);
      test.equal(things[0].class, 'ThingModel');
      test.equal(things[1].name, 'Bob');
      test.equal(things[1].id, 2);
      test.done();
    });
  },
  'test findAll method returns array of results (with userParams arg)': function(test) {
    var Thing = Seq.getModel('Thing');
    Thing.findAll({  where: "number = ?" }, [ 42 ], function(err, things) {
      if (err) throw err;
      test.equal(things.length, 2);
      test.equal(things[0].name, 'Bill');
      test.equal(things[0].id, 1);
      test.equal(things[0].class, 'ThingModel');
      test.equal(things[1].name, 'Sally');
      test.equal(things[1].id, 3);
      test.equal(things[1].class, 'ThingModel');
      test.done();
    });
  },
  'test findAll method returns limited number of results but still an Array': function(test) {
    var Thing = Seq.getModel('Thing');
    Thing.findAll({  where: "number = ?", limit: 1 }, [ 42 ], function(err, things) {
      if (err) throw err;
      test.equal(things.length, 1);
      test.equal(things[0].name, 'Bill');
      test.equal(things[0].id, 1);
      test.equal(things[0].class, 'ThingModel');
      test.done();
    });
  },
  'test findAll method can find all elements': function(test) {
    var Thing = Seq.getModel('Thing');
    Thing.findAll(function(err, things) {
      if (err) throw err;
      test.equal(things.length, 4);
      test.equal(things[0].name, 'Bill');
      test.equal(things[0].id, 1);
      test.equal(things[0].class, 'ThingModel');
      test.equal(things[1].name, 'Bob');
      test.equal(things[1].id, 2);
      test.equal(things[2].name, 'Sally');
      test.equal(things[2].id, 3);
      test.equal(things[3].name, 'Zoe');
      test.equal(things[3].id, 4);
      test.done();
    });
  },
  'test findAll method can take an Array as limit': function(test) {
    var Thing = Seq.getModel('Thing');
    Thing.findAll({ limit: [1,2] }, function(err, things) {
      if (err) throw err;
      test.equal(things.length, 2);
      test.equal(things[0].name, 'Bob');
      test.equal(things[0].id, 2);
      test.equal(things[1].name, 'Sally');
      test.equal(things[1].id, 3);
      test.done();
    });
  },
  'test findAll method with limit and offset': function(test) {
    var Thing = Seq.getModel('Thing');
    Thing.findAll({ offset: 1, limit: 2 }, function(err, things) {
      if (err) throw err;
      test.equal(things.length, 2);
      test.equal(things[0].name, 'Bob');
      test.equal(things[0].id, 2);
      test.equal(things[1].name, 'Sally');
      test.equal(things[1].id, 3);
      test.done();
    });
  },
  'test findAllAsHash method works with default id as key': function(test) {
    var Thing = Seq.getModel('Thing');
    Thing.findAllAsHash({ limit: [1,2] }, function(err, things) {
      if (err) throw err;
      test.equal(typeof things, 'object');
      test.equal(things[2].name, 'Bob');
      test.equal(things[2].id, 2);
      test.equal(things[3].name, 'Sally');
      test.equal(things[3].id, 3);
      test.done();
    });
  },
  'test findAllAsHash method works with name as key': function(test) {
    var Thing = Seq.getModel('Thing');
    Thing.findAllAsHash({ key: 'name', limit: [1,2] }, function(err, things) {
      if (err) throw err;
      test.equal(typeof things, 'object');
      test.equal(things['Bob'].name, 'Bob');
      test.equal(things['Bob'].id, 2);
      test.equal(things['Sally'].name, 'Sally');
      test.equal(things['Sally'].id, 3);
      test.done();
    });
  },
  'test findAllAsHash method works with camelized key': function(test) {
    var Thing = Seq.getModel('Thing');
    Thing.findAllAsHash({ key: 'someText', where: "name='Zoe'" }, function(err, things) {
      if (err) throw err;
      test.equal(typeof things, 'object');
      test.equal(things['I was here'].name, 'Zoe');
      test.equal(things['I was here'].id, 4);
      test.done();
    });
  },
  'test findAllAsHash method returns error if key is not a valid column': function(test) {
    var Thing = Seq.getModel('Thing');
    Thing.findAllAsHash({ key: 'dontThere', limit: [1,2] }, function(err, things) {
      test.equal(err.constructor, Seq.errors.NotValidColumnError);
      test.equal(things, null);
      test.done();
    });
  },

  'test find can find only some attributes': function(test) {
    var Thing = Seq.getModel('Thing');
    Thing.find({ only: ['name', 'float'], where: "name='Zoe'" }, function(err, thing) {
      if (err) throw err;

      test.equal(thing.name, 'Zoe');
      test.equal(thing.float, 99.9091);
      test.equal(thing.number, null);
      test.equal(thing.id, 4);
      test.equal(thing.bool, null);
      test.equal(thing.someText, null);
      test.done();
    });
  },
  'test find can cope with camelized attributes': function(test) {
    var Thing = Seq.getModel('Thing');
    Thing.find({ only: ['name', 'someText'], where: "name='Zoe'" }, function(err, thing) {
      if (err) throw err;

      test.equal(thing.someText, 'I was here');
      test.done();
    });
  },
  'test findAll can find only some attributes': function(test) {
    var Thing = Seq.getModel('Thing');
    Thing.findAll({ only: ['name', 'float'], where: "name='Zoe'" }, function(err, things) {
      if (err) throw err;

      test.equal(things[0].name, 'Zoe');
      test.equal(things[0].float, 99.9091);
      test.equal(things[0].number, null);
      test.equal(things[0].id, 4);
      test.equal(things[0].bool, null);
      test.equal(things[0].someText, null);
      test.done();
    });
  },
  'test find method returns error if key in only attribute is not a valid column': function(test) {
    var Thing = Seq.getModel('Thing');
    Thing.find({ only: ['id', 'dontThere'] }, function(err, thing) {
      test.equal(err.constructor, Seq.errors.NotValidColumnError);
      test.equal(thing, null);
      test.done();
    });
  },

  'test find can find all attributes except some': function(test) {
    var Thing = Seq.getModel('Thing');
    Thing.find({ except: ['float', 'number'], where: "name='Zoe'" }, function(err, thing) {
      if (err) throw err;

      test.equal(thing.name, 'Zoe');
      test.equal(thing.float, null);
      test.equal(thing.number, null);
      test.equal(thing.id, 4);
      test.equal(thing.bool, true);
      test.equal(thing.someText, 'I was here');
      test.done();
    });
  },
  'test findAll can find all attributes except some': function(test) {
    var Thing = Seq.getModel('Thing');
    Thing.findAll({ except: ['name', 'float'], where: "name='Zoe'" }, function(err, things) {
      if (err) throw err;

      test.equal(things[0].name, null);
      test.equal(things[0].float, null);
      test.equal(things[0].number, -3423);
      test.equal(things[0].id, 4);
      test.equal(things[0].bool, true);
      test.equal(things[0].someText, 'I was here');
      test.done();
    });
  },
  'test find method returns error if key in except attribute is not a valid column': function(test) {
    var Thing = Seq.getModel('Thing');
    Thing.find({ except: ['name', 'dontThere'] }, function(err, thing) {
      test.equal(err.constructor, Seq.errors.NotValidColumnError);
      test.equal(thing, null);
      test.done();
    });
  }
};

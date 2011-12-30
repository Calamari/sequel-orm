var Seq         = require(__dirname + '/..'),
    jaz         = require('jaz-toolkit'),
    mysql       = require('mysql'),
    TEST_CONFIG = require(__dirname + '/test_config'),
    client      = mysql.createClient(TEST_CONFIG);

module.exports['model.find methods'] = {
  setUp: function(cb) {
    var db  = Seq.create(TEST_CONFIG);
    this.db = db;
    client.query("DROP TABLE things;", function() {
      var tableDef = function(table) {
        table.addColumn('name', Seq.dataTypes.VARCHAR());
        table.addColumn('number', Seq.dataTypes.INT());
        table.addColumn('float', Seq.dataTypes.FLOAT());
        table.addColumn('time', Seq.dataTypes.DATETIME());
        table.addColumn('bool', Seq.dataTypes.BOOLEAN());
        table.addTimestamps();
      };
      Seq.createTable('things', tableDef);
      Seq.defineModel('Thing', Seq.getTableFromMigration('things'));
      db.createTable('things', tableDef, function() {
        var values = [],
            params = [];
        values.push('(?,?,?,?,?,?)');
        params.push([ 1, 'Bill', 42, 23.3, new Date(2001, 3, 3), false]);
        values.push('(?,?,?,?,?,?)');
        params.push([ 2, 'Bob', 20, 2232, new Date(2011, 12, 24), false]);
        values.push('(?,?,?,?,?,?)');
        params.push([ 3, 'Sally', 42, 0.666, new Date(1990, 5, 28), true]);
        values.push('(?,?,?,?,?,?)');
        params.push([ 4, 'Zoe', -3423, 99.90909, new Date(2000, 1, 1), true]);
        client.query("INSERT INTO things (`id`, `name`, `number`, `float`, `time`, `bool`) VALUES " + values.join(','), jaz.Array.flatten(params), function(err) {
          if (err) throw err;
          cb();
        });
      });
    });
  },
  'test find with id': function(test) {
    var Thing = Seq.getModel('Thing');
    Thing.find(3, function(err, thing) {
      if (err) throw err;
      test.equal(thing.name, 'Sally');
      test.equal(thing.number, 42);
      test.equal(thing.id, 3);
      test.equal(thing.bool, true);
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
  }
};

/**
 TODO:
  findAll
    wiht limit
  findAllAsHash
  Test datetimes mit before save and after load methods
  Define custom before save methods
  
  
  later on:
  caching (remember item,id combo in cache and don't query for them)
 */

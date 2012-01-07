var Seq = require(__dirname + '/..'),
    mysql = require('mysql'),
    TEST_CONFIG = require(__dirname + '/test_config');
    client = mysql.createClient(TEST_CONFIG);

module.exports['basics'] = {
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

module.exports['table migrations'] = {
  setUp: function(cb) {
    Seq.removeConnection();
    client.query("DROP TABLE products;", function() {
      cb();
    });
  },
  tearDown: function(cb) {
    Seq.removeAllListeners('log');
    cb();
  },
  'test table created': function(test) {
    test.expect(4);
    var db   = Seq.create(TEST_CONFIG),
        next = 1;
    Seq.on('log', function(status, message) {
      test.equal(status, Seq.LOG_LEVEL_INFO);
      if (next === 1) {
        test.equal(message, "Sending SQL: CREATE TABLE products (`id` INT(11) AUTO_INCREMENT PRIMARY KEY,`name` VARCHAR(255) NOT NULL);");
        next = 2;
      } else {
        test.equal(message, "Table 'products' created");
      }
    });
    db.createTable('products', function(table) {
      table.addColumn('name', Seq.dataTypes.VARCHAR());
    }, function(err) {
      if (err) throw err;
      test.done();
    });
  },
  'test table updated': function(test) {
    test.expect(4);
    var db   = Seq.create(TEST_CONFIG),
        next = 1;
    db.createTable('products', function(table) {
      table.addColumn('name', Seq.dataTypes.VARCHAR());
    }, function(err) {
      Seq.on('log', function(status, message) {
        test.equal(status, Seq.LOG_LEVEL_INFO);
        if (next === 1) {
          test.equal(message, "Sending SQL: ALTER TABLE products DROP COLUMN name;");
          next = 2;
        } else {
          test.equal(message, "Table 'products' updated");
        }
      });
      db.updateTable('products', function(table) {
        table.removeColumn('name');
      }, function(err) {
        if (err) throw err;
        test.done();
      });
    });
  },
  'test table creation failed': function(test) {
    test.expect(4);
    var db   = Seq.create(TEST_CONFIG),
        next = 1;
    db.createTable('products', function(table) {
      table.addColumn('name', Seq.dataTypes.VARCHAR());
    }, function(err) {
      Seq.on('log', function(status, message) {
        if (next === 1) {
          test.equal(status, Seq.LOG_LEVEL_INFO);
          test.equal(message, "Sending SQL: CREATE TABLE products (`id` INT(11) AUTO_INCREMENT PRIMARY KEY,`name` VARCHAR(255) NOT NULL);");
          next = 2;
        } else {
          test.equal(status, Seq.LOG_LEVEL_ERROR);
          test.equal(message, "Could not create table 'products'. Table 'products' already exists.");
        }
      });
      db.createTable('products', function(table) {
        table.addColumn('name', Seq.dataTypes.VARCHAR());
      }, function(err) {
        test.done();
      });
    });
  },
  'test table update failed': function(test) {
    test.expect(4);
    var db   = Seq.create(TEST_CONFIG),
        next = 1;
    Seq.on('log', function(status, message) {
      if (next === 1) {
        test.equal(status, Seq.LOG_LEVEL_INFO);
        test.equal(message, "Sending SQL: ALTER TABLE products DROP COLUMN name;");
        next = 2;
      } else {
        test.equal(status, Seq.LOG_LEVEL_ERROR);
        test.equal(message, "Could not update table 'products'. Table 'products' does not exist.");
      }
    });
    db.updateTable('products', function(table) {
      table.removeColumn('name');
    }, function(err) {
      test.done();
    });
  }
};

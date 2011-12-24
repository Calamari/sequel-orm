var Seq = require(__dirname + '/..'),
    mysql = require('mysql'),
    TEST_CONFIG = require(__dirname + '/test_config'),
    client = mysql.createClient(TEST_CONFIG);

module.exports.createTable = {
  setUp: function(cb) {
    this.db = Seq.create(TEST_CONFIG);
    client.query("DROP TABLE products;", function() { cb(); });
  },
  'test creating a table': function(test) {
    this.db.createTable('products', function(err) {
      if (err) throw err;
      client.query("DESCRIBE products;", function(err, result) {
        if (err) throw err;
        // if no error table exists
        test.done();
      });
    });
  },
  'test creating a existing table returns error': function(test) {
    db = this.db;
    db.createTable('products', function(err) {
      if (err) throw err;
      db.createTable('products', function(err) {
        test.equal(err.constructor, Seq.errors.TableAlreadyExistsError, "Error should be of Type TableAlreadyExistsError");
        test.done();
      });
    });
  },
  'test creating a table automatically adds an id field': function(test) {
    this.db.createTable('products', function(err) {
      if (err) throw err;
      client.query("DESCRIBE products;", function(err, result) {
        if (err) throw err;
        test.equal(result.length, 1, 'We should have a table with only one field');
        test.equal(result[0].Field, 'id');
        test.equal(result[0].Key, 'PRI');
        test.equal(result[0].Extra, 'auto_increment');
        test.equal(result[0].Type, 'int(11)');
        test.done();
      });
    });
  },
  'test adding column without valid data type returns error': function(test) {
    this.db.createTable('products', function(table) {
      table.addColumn('foo', 'VARCHAR(11)');
    }, function(err) {
      test.equal(err.constructor, Seq.errors.NotADataTypeError, "Error should be of Type NotADataTypeError");
      test.done();
    });
  },
  'test adding columns to a table': function(test) {
    this.db.createTable('products', function(table) {
      table.addColumn('foo', Seq.dataTypes.VARCHAR());
      table.addColumn('my_time', Seq.dataTypes.DATETIME());
      table.addColumn('myint', Seq.dataTypes.INT());
      table.addColumn('floating', Seq.dataTypes.FLOAT());
      table.addColumn('sure', Seq.dataTypes.BOOLEAN());
      table.addColumn('text', Seq.dataTypes.TEXT());
    }, function(err) {
      if (err) throw err;
      client.query("DESCRIBE products;", function(err, result) {
        if (err) throw err;
        test.equal(result.length, 7, 'We should have a table with all seven fields');
        test.done();
      });
    });
  },
  'test adding a VARCHAR column without arguments': function(test) {
    this.db.createTable('products', function(table) {
      table.addColumn('foo', Seq.dataTypes.VARCHAR());
    }, function(err) {
      if (err) throw err;
      client.query("DESCRIBE products;", function(err, result) {
        if (err) throw err;
        test.equal(result.length, 2, 'We should have a table with only one field');
        test.equal(result[1].Field, 'foo');
        test.equal(result[1].Null, 'NO');
        test.equal(result[1].Key, '');
        test.equal(result[1].Extra, '');
        test.equal(result[1].Type, 'varchar(255)');
        test.done();
      });
    });
  },
  'test adding a VARCHAR column with overriding length': function(test) {
    this.db.createTable('products', function(table) {
      table.addColumn('foo', Seq.dataTypes.VARCHAR({ length: 32 }));
    }, function(err) {
      if (err) throw err;
      client.query("DESCRIBE products;", function(err, result) {
        if (err) throw err;
        test.equal(result.length, 2, 'We should have a table with only one field');
        test.equal(result[1].Field, 'foo');
        test.equal(result[1].Null, 'NO');
        test.equal(result[1].Key, '');
        test.equal(result[1].Extra, '');
        test.equal(result[1].Type, 'varchar(32)');
        test.done();
      });
    });
  },
  'test making a VARCHAR nullable': function(test) {
    this.db.createTable('products', function(table) {
      table.addColumn('foo', Seq.dataTypes.VARCHAR({ allowNull: true }));
    }, function(err) {
      if (err) throw err;
      client.query("DESCRIBE products;", function(err, result) {
        if (err) throw err;
        test.equal(result.length, 2, 'We should have a table with two fields');
        test.equal(result[1].Field, 'foo');
        test.equal(result[1].Null, 'YES');
        test.equal(result[1].Key, '');
        test.equal(result[1].Extra, '');
        test.equal(result[1].Type, 'varchar(255)');
        test.done();
      });
    });
  },
  'test making columns (not) nullable': function(test) {
    this.db.createTable('products', function(table) {
      table.addColumn('nully', Seq.dataTypes.VARCHAR({ allowNull: true }));
      table.addColumn('nully_int', Seq.dataTypes.INT({ allowNull: true }));
      table.addColumn('nully_datetime', Seq.dataTypes.DATETIME({ allowNull: true }));
      table.addColumn('nully_bool', Seq.dataTypes.BOOLEAN({ allowNull: true }));
      table.addColumn('not_nully', Seq.dataTypes.VARCHAR({ allowNull: false }));
      table.addColumn('not_nully_int', Seq.dataTypes.INT({ allowNull: false }));
      table.addColumn('not_nully_datetime', Seq.dataTypes.DATETIME({ allowNull: false }));
      table.addColumn('not_nully_bool', Seq.dataTypes.BOOLEAN({ allowNull: false }));
    }, function(err) {
      if (err) throw err;
      client.query("DESCRIBE products;", function(err, result) {
        if (err) throw err;
        test.equal(result.length, 9, 'We should have a table with nine fields');
        test.equal(result[1].Null, 'YES', result[1].Field + ' should be nullable');
        test.equal(result[2].Null, 'YES', result[2].Field + ' should be nullable');
        test.equal(result[3].Null, 'YES', result[3].Field + ' should be nullable');
        test.equal(result[4].Null, 'YES', result[4].Field + ' should be nullable');
        test.equal(result[5].Null, 'NO', result[5].Field + ' should be not nullable');
        test.equal(result[6].Null, 'NO', result[6].Field + ' should be not nullable');
        test.equal(result[7].Null, 'NO', result[7].Field + ' should be not nullable');
        test.equal(result[8].Null, 'NO', result[8].Field + ' should be not nullable');
        test.done();
      });
    });
  },
  'test datetime columns can not have a default value': function(test) {
    this.db.createTable('products', function(table) {
      table.addColumn('def_datetime', Seq.dataTypes.DATETIME({ default: 'NOW' }));
    }, function(err) {
      test.equal(err.constructor, Seq.errors.DefaultValueForbiddenError, "Error should be of Type DefaultValueForbiddenError");
      test.done();
    });
  },
  'test making columns having default values': function(test) {
    this.db.createTable('products', function(table) {
      table.addColumn('def', Seq.dataTypes.VARCHAR({ default: 'some text' }));
      table.addColumn('def_int', Seq.dataTypes.INT({ default: 42 }));
      table.addColumn('def_float', Seq.dataTypes.FLOAT({ default: 42.5 }));
      table.addColumn('def_bool', Seq.dataTypes.BOOLEAN({ default: true }));
      table.addColumn('no_def', Seq.dataTypes.VARCHAR({ default: false }));
      table.addColumn('no_def_int', Seq.dataTypes.INT({ default: false }));
      table.addColumn('no_def_float', Seq.dataTypes.FLOAT({ default: false }));
      table.addColumn('no_def_bool', Seq.dataTypes.BOOLEAN({ default: false }));
    }, function(err) {
      if (err) throw err;
      client.query("DESCRIBE products;", function(err, result) {
        if (err) throw err;
        test.equal(result.length, 9, 'We should have a table with nine fields');
        test.equal(result[1].Default, 'some text', result[1].Field + ' should have default value');
        test.equal(result[2].Default, 42, result[2].Field + ' should have default value');
        test.equal(result[3].Default, 42.5, result[3].Field + ' should have default value');
        test.equal(result[4].Default, 1, result[4].Field + ' should have default value');
        test.equal(result[5].Default, null, result[5].Field + ' should not have default value');
        test.equal(result[6].Default, null, result[6].Field + ' should not have default value');
        test.equal(result[7].Default, null, result[7].Field + ' should not have default value');
        test.equal(result[8].Default, null, result[8].Field + ' should not have default value');
        test.done();
      });
    });
  },
  'test single unique columns': function(test) {
    this.db.createTable('products', function(table) {
      table.addColumn('its_unique', Seq.dataTypes.VARCHAR({ unique: true }));
      table.addColumn('not_unique', Seq.dataTypes.VARCHAR());
    }, function(err) {
      if (err) throw err;
      client.query("DESCRIBE products;", function(err, result) {
        if (err) throw err;
        test.equal(result.length, 3, 'We should have a table with three fields');
        test.equal(result[1].Key, 'UNI');
        test.equal(result[2].Key, '');
        test.done();
      });
    });
  },
  'test single unique columns via addUniqueKey method': function(test) {
    this.db.createTable('products', function(table) {
      table.addColumn('its_unique', Seq.dataTypes.VARCHAR());
      table.addColumn('not_unique', Seq.dataTypes.VARCHAR());
      table.addUniqueKey('its_unique');
    }, function(err) {
      if (err) throw err;
      client.query("DESCRIBE products;", function(err, result) {
        if (err) throw err;
        test.equal(result.length, 3, 'We should have a table with three fields');
        test.equal(result[1].Key, 'UNI');
        test.equal(result[2].Key, '');
        test.done();
      });
    });
  },
  'test multicolumn uniques': function(test) {
    this.db.createTable('products', function(table) {
      table.addColumn('unique_part_one', Seq.dataTypes.VARCHAR());
      table.addColumn('unique_part_two', Seq.dataTypes.VARCHAR());
      table.addColumn('not_unique', Seq.dataTypes.VARCHAR());
      table.addUniqueKey(['unique_part_one', 'unique_part_two']);
    }, function(err) {
      if (err) throw err;
      client.query("DESCRIBE products;", function(err, result) {
        if (err) throw err;
        test.equal(result.length, 4, 'We should have a table with three fields');
        test.equal(result[1].Key, 'MUL');
        test.equal(result[2].Key, '');
        test.equal(result[3].Key, '');
        test.done();
      });
    });
  },
  'test dropping of a Table': function(test) {
    var db = this.db;
    db.createTable('products', function(err) {
      if (err) throw err;
      db.dropTable('products', function(err) {
        if (err) throw err;
        client.query("DESCRIBE products;", function(err, result) {
          test.ok(err, 'should be errornous because table should be deleted.');
          test.done();
        });
      });
    });
  }
};

module.exports.updateTable = {
  setUp: function(cb) {
    var db = Seq.create(TEST_CONFIG);
    this.db = db;
    client.query("DROP TABLE tasks;", function(err) {
      if (err) throw err;
      db.createTable('tasks', function(table) {
        table.addColumn('name', Seq.dataTypes.VARCHAR());
        table.addColumn('done', Seq.dataTypes.VARCHAR());
        table.addColumn('created_at', Seq.dataTypes.VARCHAR());
      }, function(err) {
        if (err) throw err;
        cb();
      });
    });
  },
  'test if updateTable takes a function as parameter and a callback': function(test) {
    test.expect(1);
    this.db.updateTable('tasks', function(table) {
      test.ok(table);
    }, function(err) {
      if (err) throw err;
      test.done();
    });
  },
  'test if updateTable returns error if table does not exist': function(test) {
    test.expect(2);
    this.db.updateTable('not_there', function(table) {
      test.ok(table);
    }, function(err) {
      test.equal(err.constructor, Seq.errors.TableNotFoundError, "Error should be of Type TableNotFoundError");
      test.done();
    });
  },
  'test add columns to table': function(test) {
    this.db.updateTable('tasks', function(table) {
      table.addColumn('test', Seq.dataTypes.VARCHAR());
    }, function(err) {
      if (err) throw err;
      client.query("DESCRIBE tasks;", function(err, result) {
        if (err) throw err;
        test.equal(result.length, 5, 'We should have one additional field now');
        test.equal(result[4].Field, 'test');
        test.done();
      });
    });
  },
  'test remove columns from table': function(test) {
    this.db.updateTable('tasks', function(table) {
      table.removeColumn('done', Seq.dataTypes.VARCHAR());
    }, function(err) {
      if (err) throw err;
      client.query("DESCRIBE tasks;", function(err, result) {
        if (err) throw err;
        test.equal(result.length, 3, 'We should have one field less now');
        test.equal(result[0].Field, 'id');
        test.equal(result[1].Field, 'name');
        test.equal(result[2].Field, 'created_at');
        test.done();
      });
    });
  },
  'test make a single column unique': function(test) {
    this.db.updateTable('tasks', function(table) {
      table.addUniqueKey('done');
    }, function(err) {
      if (err) throw err;
      client.query("DESCRIBE tasks;", function(err, result) {
        if (err) throw err;
        test.equal(result.length, 4, 'We should still have four fields');
        test.equal(result[2].Key, 'UNI');
        test.done();
      });
    });
  },
  'test make a multi column unique': function(test) {
    this.db.updateTable('tasks', function(table) {
      table.addUniqueKey(['done', 'name']);
      table.addUniqueKey('created_at');
    }, function(err) {
      if (err) throw err;
      client.query("DESCRIBE tasks;", function(err, result) {
        if (err) throw err;
        test.equal(result.length, 4, 'We should still have four fields');
        test.equal(result[2].Key, 'MUL');
        test.equal(result[3].Key, 'UNI');
        test.done();
      });
    });
  },
  'test removes a single column unique': function(test) {
    this.db.updateTable('tasks', function(table) {
      table.addUniqueKey('done');
      table.addUniqueKey('name');
    }, function(err) {
      if (err) throw err;
      this.db.updateTable('tasks', function(table) {
        table.removeUniqueKey('done');
      }, function(err) {
        if (err) throw err;
        client.query("DESCRIBE tasks;", function(err, result) {
          if (err) throw err;
          test.equal(result.length, 4, 'We should still have four fields');
          test.equal(result[2].Key, '');
          test.equal(result[1].Key, 'UNI');
          test.done();
        });
      });
    });
  },
  'test removes a multi column unique': function(test) {
    this.db.updateTable('tasks', function(table) {
      table.addUniqueKey(['done', 'name']);
      table.addUniqueKey('created_at');
    }, function(err) {
      if (err) throw err;
      this.db.updateTable('tasks', function(table) {
        table.removeUniqueKey(['done', 'name']);
      }, function(err) {
        if (err) throw err;
        client.query("DESCRIBE tasks;", function(err, result) {
          if (err) throw err;
          test.equal(result.length, 4, 'We should still have four fields');
          test.equal(result[1].Key, '');
          test.equal(result[2].Key, '');
          test.equal(result[3].Key, 'UNI');
          test.done();
        });
      });
    });
  },
  'test removes a non existing key returns error': function(test) {
    this.db.updateTable('tasks', function(table) {
      table.addUniqueKey(['done', 'name']);
    }, function(err) {
      if (err) throw err;
      this.db.updateTable('tasks', function(table) {
        table.removeUniqueKey('name');
      }, function(err) {
        test.equal(err.constructor, Seq.errors.ColumnNotFoundError, "Error should be of Type ColumnNotFoundError");
        test.done();
      });
    });
  },
  'test removing of a multi column from createTable': function(test) {
    var db = this.db;
    client.query("DROP TABLE IF EXISTS more_tasks;", function(err) {
      if (err) throw err;
      db.createTable('more_tasks', function(table) {
        table.addColumn('name', Seq.dataTypes.VARCHAR());
        table.addColumn('done', Seq.dataTypes.VARCHAR());
        table.addUniqueKey(['done', 'name']);
      }, function(err) {
        if (err) throw err;
        db.updateTable('more_tasks', function(table) {
          table.removeUniqueKey(['done', 'name']);
        }, function(err) {
          if (err) throw err;
          client.query("DESCRIBE more_tasks;", function(err, result) {
            if (err) throw err;
            test.equal(result.length, 3, 'We should still have three fields');
            test.equal(result[1].Key, '');
            test.equal(result[2].Key, '');
            test.done();
          });
        });
      });
    });
  }
};

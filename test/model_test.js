var Seq = require(__dirname + '/..'),
    mysql = require('mysql'),
    TEST_CONFIG = require(__dirname + '/test_config'),
    client = mysql.createClient(TEST_CONFIG);

module.exports.modelDefinition = {
  setUp: function(cb) {
    var db  = Seq.create(TEST_CONFIG);
    this.db = db;
    client.query("DROP TABLE items;", function() {
      Seq.createTable('items', function(table) {
        table.addColumn('name', Seq.dataTypes.VARCHAR());
        table.addColumn('price', Seq.dataTypes.INT());
        table.addTimestamps();
      });
      cb();
    });
  },
  'test creating a model using data types': function(test) {
    var Product = Seq.defineModel('Item', {
      name: Seq.dataTypes.VARCHAR(),
      price: Seq.dataTypes.INT(),
      createdAt: Seq.dataTypes.DATETIME(),
      updatedAt: Seq.dataTypes.DATETIME()
    });
    test.equal(typeof Product, 'object');
    test.equal(Product.name, 'Item');
    test.equal(Product.tableName, 'items');
    test.done();
  },
  'test getting tableName': function(test) {
    var Product = Seq.defineModel('Miss', {
    });
    test.equal(Product.tableName, 'miss', 'don\'t append a plural s at the end, if there is alredy one');
    test.done();
  },
  'test creating a model has fields': function(test) {
    var Product = Seq.defineModel('Item', {
      name: Seq.dataTypes.VARCHAR(),
      price: Seq.dataTypes.INT(),
      createdAt: Seq.dataTypes.DATETIME(),
      updatedAt: Seq.dataTypes.DATETIME()
    });
    test.equal(Product.fields.length, 5);
    test.ok(Product.fields.indexOf('id') !== -1);
    test.ok(Product.fields.indexOf('name') !== -1);
    test.ok(Product.fields.indexOf('price') !== -1);
    test.ok(Product.fields.indexOf('createdAt') !== -1);
    test.ok(Product.fields.indexOf('updatedAt') !== -1);
    test.done();
  },
  'test create model from migration': function(test) {
    var Product = Seq.defineModel('Item', Seq.getTableFromMigration('items'));
    test.equal(Product.fields.length, 5);
    test.ok(Product.fields.indexOf('id') !== -1);
    test.ok(Product.fields.indexOf('name') !== -1);
    test.ok(Product.fields.indexOf('price') !== -1);
    test.ok(Product.fields.indexOf('createdAt') !== -1);
    test.ok(Product.fields.indexOf('updatedAt') !== -1);
    test.done();
  },
  'test retrieving of Model throuh SequelORM class': function(test) {
    var Product = Seq.getModel('Item');
    test.equal(Product.fields.length, 5);
    test.ok(Product.fields[0], 'id');
    test.ok(Product.fields[1], 'name');
    test.ok(Product.fields[2], 'price');
    test.ok(Product.fields[3], 'createdAt');
    test.ok(Product.fields[4], 'updatedAt');
    test.done();
  }
};

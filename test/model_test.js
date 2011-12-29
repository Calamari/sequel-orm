var Seq = require(__dirname + '/..'),
    mysql = require('mysql'),
    TEST_CONFIG = require(__dirname + '/test_config'),
    client = mysql.createClient(TEST_CONFIG);

module.exports.modelDefinition = {
  setUp: function(cb) {
    var db  = Seq.create(TEST_CONFIG);
    this.db = db;
    client.query("DROP TABLE products;", function() {
      db.createTable('products', function(table) {
        table.addColumn('name', Seq.dataTypes.VARCHAR());
        table.addColumn('price', Seq.dataTypes.INT());
        table.addTimestamps();
      }, function(err) {
        if (err) throw err;
        cb();
      });
    });
  },
  'test creating a model using data types': function(test) {
    var Product = Seq.defineModel('Product', {
      name: Seq.dataTypes.VARCHAR(),
      price: Seq.dataTypes.INT(),
      createdAt: Seq.dataTypes.DATETIME(),
      updatedAt: Seq.dataTypes.DATETIME()
    });
    test.equal(typeof Product, 'object');
    test.equal(Product.name, 'Product');
    test.equal(Product.tableName, 'products');
    test.done();
  },
  'test getting tableName': function(test) {
    var Product = Seq.defineModel('Miss', {
    });
    test.equal(Product.tableName, 'miss', 'don\'t append a plural s at the end, if there is alredy one');
    test.done();
  },
  'test creating a model has fields': function(test) {
    var Product = Seq.defineModel('Product', {
      name: Seq.dataTypes.VARCHAR(),
      price: Seq.dataTypes.INT(),
      createdAt: Seq.dataTypes.DATETIME(),
      updatedAt: Seq.dataTypes.DATETIME()
    });
    test.equal(Product.fields.length, 5);
    test.equal(Product.fields[0], 'id');
    test.equal(Product.fields[1], 'name');
    test.equal(Product.fields[2], 'price');
    test.equal(Product.fields[3], 'createdAt');
    test.equal(Product.fields[4], 'updatedAt');
    test.done();
  }
};

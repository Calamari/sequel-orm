var EventEmitter     = require('events').EventEmitter,
    jaz              = require('jaz-toolkit'),

    errors           = require(__dirname + '/errors'),
    helpers          = require(__dirname + '/helpers'),
    
    SQL_DROP_TABLE   = 'DROP TABLE #{tableName}',
    
    undef,

    TableMigrator = require(__dirname + '/table_migrator'),
    TableCreator  = require(__dirname + '/table_creator'),
    TableUpdater  = require(__dirname + '/table_updater'),
    
    migrations = {};


module.exports = {
  /**
   * Creates a Table instance
   * @param {MysqlClient} client
   * @param {String}      tableName Name of the table
   * @param {function}    block block that is called with the Table object
   * @param {function}    cb Callback to call after finished
   * @return {TableCreator}
   */
  create: function(client, tableName, block, cb) {
    if (cb == undef) {
      cb = block;
      block = null;
    }
    var tableCreator = new TableCreator(tableName, block);
    return tableCreator.sync(client, cb);
  },

  /**
   * Updates a Table
   * @param {MysqlClient} client
   * @param {String}      tableName Name of the table
   * @param {function}    block block that is called with the Table object
   * @param {function}    cb Callback to call after finished
   * @return {TableUpdater}
   */
  update: function(client, tableName, block, cb) {
    if (cb == undef) {
      cb = block;
      block = null;
    }
    var tableUpdater = new TableUpdater(tableName, block);
    return tableUpdater.sync(client, cb);
  },
  
  /**
   * Generates a TableMigrator
   * @param {String|TableMigrator} tableName Name of the table or TableMigrator instance
   * @param {function}             block     function that is called with the Table object
   * @param {String}               type      Type of migration ('create' or 'update')
   * @return {TableMigrator}
   */
  migrate: function(tableName, block, type) {
    if (typeof tableName === 'string') {
      var tableMigrator = migrations[tableName];
      if (!tableMigrator) {
        tableMigrator = new TableMigrator(tableName, type);
      }
      migrations[tableName] = tableMigrator;
    } else {
      tableMigrator = tableName;
    }
    tableMigrator.update(block);
    return tableMigrator;
  },

  /**
   * Generates an association join table for a many to many association
   * @param {String} tableName1 Name of the first table in singular
   * @param {String} tableName2 Name of the second table in singular
   */
  createManyToManyAssociationTable: function(client, tableName1, tableName2, cb) {
    var SequelORM     = require(__dirname + '/'),
        joinTableName = helpers.getJoinTableName(tableName1, tableName2),
        tmp, tableCreator;
    tableName1 = jaz.String.underscore(tableName1);
    tableName2 = jaz.String.underscore(tableName2);

    tableCreator = new TableCreator(joinTableName, function(table) {
      table.addColumn(tableName1 + '_id', SequelORM.dataTypes.INT());
      table.addColumn(tableName2 + '_id', SequelORM.dataTypes.INT());
      table.addUniqueKey([ tableName1 + '_id', tableName2 + '_id' ]);
    });
    tableCreator.sync(client, cb);
  },

  /**
   * Removes the association join table for the many to many association again
   * @param {String} tableName1 Name of the first table in singular form
   * @param {String} tableName2 Name of the second table in singular form
   */
  dropManyToManyAssociationTable: function(client, tableName1, tableName2, cb) {
    this.drop(client, helpers.getJoinTableName(tableName1, tableName2), cb);
  },
  
  /**
   * Returns a TableMigrator instance for specific table name or null
   * @return {TableMigrator}
   */
  getTableMigrator: function(tableName) {
    return migrations[tableName] || null;
  },
  
  /**
   * Clears all Migrations
   */
  clearMigrations: function() {
      migrations = {};
  },
  
  /**
   * Drops a Table
   * @param {MysqlClient} client
   * @param {String}      tableName Name of the table
   * @param {function}    cb Callback to call after finished
   */
  drop: function(client, tableName, cb) {
    client.query(jaz.String.interpolate(SQL_DROP_TABLE, { tableName: tableName }), cb);
  }
};

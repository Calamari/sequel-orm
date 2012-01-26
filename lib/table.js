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

"use strict";


/**
 * Table Modules
 * @module Table
 */
module.exports = {
  /**
   * Creates a Table instance
   * @method create
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
   * @method update
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
   * @method migrate
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
   * Generates an association join table of two models for a many to many association
   * @method createManyToManyAssociationTable
   * @param {String} modelName1 Name of the first model
   * @param {String} modelName2 Name of the second model
   */
  createManyToManyAssociationTable: function(client, modelName1, modelName2, cb) {
    var SequelORM     = require(__dirname + '/'),
        joinTableName = helpers.getJoinTableName(modelName1, modelName2),
        tableName1    = jaz.String.underscore(modelName1),
        tableName2    = jaz.String.underscore(modelName2),
        tmp, tableCreator;

    tableCreator = new TableCreator(joinTableName, function(table) {
      table.addColumn(tableName1 + '_id', SequelORM.dataTypes.INT());
      table.addColumn(tableName2 + '_id', SequelORM.dataTypes.INT());
      table.addUniqueKey([ tableName1 + '_id', tableName2 + '_id' ]);
    });
    tableCreator.sync(client, cb);
  },

  /**
   * Removes the association join table for the many to many association again
   * @method dropManyToManyAssociationTable
   * @param {String} modelName1 Name of the first model
   * @param {String} modelName2 Name of the second model
   */
  dropManyToManyAssociationTable: function(client, modelName1, modelName2, cb) {
    this.drop(client, helpers.getJoinTableName(modelName1, modelName2), cb);
  },
  
  /**
   * Returns a TableMigrator instance for specific table name or null
   * @method getTableMigrator
   * @param {String} tableName Name of table we want to 
   * @return {TableMigrator}
   */
  getTableMigrator: function(tableName) {
    return migrations[tableName] || null;
  },
  
  /**
   * Clears all Migrations
   * @method clearMigrations
   */
  clearMigrations: function() {
      migrations = {};
  },
  
  /**
   * Drops a Table
   * @method drop
   * @param {MysqlClient} client
   * @param {String}      tableName Name of the table
   * @param {function}    cb Callback to call after finished
   */
  drop: function(client, tableName, cb) {
    client.query(jaz.String.interpolate(SQL_DROP_TABLE, { tableName: tableName }), cb);
  }
};

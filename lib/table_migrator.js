var EventEmitter     = require('events').EventEmitter,
    jaz              = require('jaz-toolkit'),

    errors           = require(__dirname + '/errors'),
    dataTypes            = require(__dirname + '/data_types'),
    
    SQL_CREATE_TABLE = 'CREATE TABLE #{tableName} (#{columns});',
    SQL_ID_FIELD     = '`id` INT(11) AUTO_INCREMENT PRIMARY KEY',
    
    undef;

"use strict";

/**
 * Creates a TableMigrator instance
 * ATTENTION: At the moment it is only useful for getting the definition from the createTable and 
 * updateTable statements. The sync methods here will be added later on.
 *
 * @class TableMigrator
 * @param {String}      name Name of the table
 * @param {String}      type Type of Migration ('create' or 'update')
 */
var TableMigrator = function(tableName, type) {
  this._columns     = {};
  this._uniques     = [];
  this._foreignKeys = [];
  this._type        = type;

  this.tableName    = tableName;
  
  if (type === 'create') {
    this.addColumn('id', dataTypes.INT());
  }
};

/**
 * Calls the given Callback with TableMigrator instance for altering the table definition
 * @method update
 * @param {function}    block block that is called with the Table object
 */
TableMigrator.prototype.update = function(block) {
  block(this);
};

/**
 * Adds a column to the table
 * @method addColumn
 * @param {String} name Name of column to add
 * @param {Object} type Type of column
 */
TableMigrator.prototype.addColumn = function(name, type) {
  this._columns[name] = type;
};

/**
 * Adds unique keys
 * @method addUniqueKey
 * @param {String} name Name of column
 */
TableMigrator.prototype.addUniqueKey = function(key) {
  this._uniques.push(key);
};

/**
 * Adds column with foreign key
 * @method addBelongsToColumn
 * @param {String} table Name of table (singular) which we will referenc
 * @param {Object} [options] options containing:
 * @param {String} [options.as] Name of column (singular without _id) we use to reference foreign table
 */
TableMigrator.prototype.addBelongsToColumn = function(table, options) {
  options = options || {};
  table = jaz.String.underscore(table);
  key   = jaz.String.underscore(options.as || table);
  this.addColumn(key + '_id', dataTypes.INT({ allowNull: false }));
  this._foreignKeys.push([table, key]);
};

/**
 * removes a foreign key
 * @method removeBelongsToColumn
 * @param {String} [key] Name of column (singular without _id) we use to reference foreign table
 */
TableMigrator.prototype.removeBelongsToColumn = function(key) {
  var columnName = jaz.String.underscore(key) + '_id';
  this.removeColumn(columnName);
};

/**
 * Adds datetime columns for created and updated hooks
 * @method addTimestamps
 */
TableMigrator.prototype.addTimestamps = function() {
  this.addColumn('created_at', dataTypes.DATETIME());
  this.addColumn('updated_at', dataTypes.DATETIME());
};

/**
 * Changes a column
 * @method changeColumn
 * @throws {BadThing} farf  
 */
TableMigrator.prototype.changeColumn = function(oldName, newName, type) {
  delete this._columns[oldName];
  this._columns[newName] = type;
};

/**
 * Removes a column
 * @method removeColumn
 * @param {String} name Name of column we want to remove
 */
TableMigrator.prototype.removeColumn = function(name) {
  delete this._columns[name];
};

/**
 * Returns the list of fields the table has
 * @method getDefinition
 */
TableMigrator.prototype.getDefinition = function() {
  var columns = {};
  for (var name in this._columns) {
    columns[jaz.String.camelize(name)] = this._columns[name];
  }
  return columns;
};

module.exports = TableMigrator;

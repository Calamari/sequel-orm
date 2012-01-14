var EventEmitter     = require('events').EventEmitter,
    jaz              = require('jaz-toolkit'),

    errors           = require(__dirname + '/errors'),
    dataTypes            = require(__dirname + '/data_types'),
    
    SQL_CREATE_TABLE = 'CREATE TABLE #{tableName} (#{columns});',
    SQL_ID_FIELD     = '`id` INT(11) AUTO_INCREMENT PRIMARY KEY',
    
    undef;

/**
 * Creates a TableMigrator instance
 * ATTENTION: At the moment it is only useful for getting the definition from the createTable and 
 * updateTable statements. The sync methods here will be added later on.
 *
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
 * @param {function}    block block that is called with the Table object
 */
TableMigrator.prototype.update = function(block) {
  block(this);
};

/**
 * Adds a column to the table
 */
TableMigrator.prototype.addColumn = function(name, type) {
  this._columns[name] = type;
};

/**
 * Adds unique keys
 */
TableMigrator.prototype.addUniqueKey = function(key) {
  this._uniques.push(key);
};

/**
 * Adds column with foreign key
 * @param {String} table Name of table (singular) which we will referenc
 * @param {Object} [options] options containing:
 * @param {String} [options.as] Name of column (singular without _id) we use to reference foreign table
 */
TableMigrator.prototype.addBelongsToColumn = function(table, options) {
  options = options || {};
  table = jaz.String.underscore(table);
  key   = jaz.String.underscore(options.as || table);
  this.addColumn(key + '_id', dataTypes.INT());
  this._foreignKeys.push([table, key]);
};

/**
 * removes a foreign key
 * @param {String} [key] Name of column (singular without _id) we use to reference foreign table
 */
TableMigrator.prototype.removeBelongsToColumn = function(key) {
  var columnName = jaz.String.underscore(key) + '_id';
  this.removeColumn(columnName);
};

/**
 * Adds datetime columns for created and updated hooks
 */
TableMigrator.prototype.addTimestamps = function() {
  this.addColumn('created_at', dataTypes.DATETIME());
  this.addColumn('updated_at', dataTypes.DATETIME());
};

/**
 * Changes a column
 */
TableMigrator.prototype.changeColumn = function(oldName, newName, type) {
  delete this._columns[oldName];
  this._columns[newName] = type;
};

/**
 * Removes a column
 */
TableMigrator.prototype.removeColumn = function(name) {
  delete this._columns[name];
};

/**
 * Returns the list of fields the table has
 */
TableMigrator.prototype.getDefinition = function() {
  var columns = {};
  for (var name in this._columns) {
    columns[jaz.String.camelize(name)] = this._columns[name];
  }
  return columns;
};

module.exports = TableMigrator;

var EventEmitter     = require('events').EventEmitter,
    jaz              = require('jaz-toolkit'),

    errors           = require(__dirname + '/errors'),
    types            = require(__dirname + '/data_types'),
    
    SQL_CREATE_TABLE = 'CREATE TABLE #{tableName} (#{columns});',
    SQL_ID_FIELD     = '`id` INT(11) AUTO_INCREMENT PRIMARY KEY',
    
    undef;

"use strict";

/**
 * Creates a Table instance
 * @class TableCreator
 * @param {String}      tableName Name of the table
 * @param {function}    block block that is called with the Table object
 */
var TableCreator = function(tableName, block) {
  this._columns     = {};
  this._uniques     = [];
  this._foreignKeys = [];

  this.tableName    = jaz.String.underscore(tableName);

  block && block(this);
};

/**
 * Calls the MySQL database and create the table
 * @method sync
 * @param {MysqlClient} client
 * @param {function}    cb Callback to call after finished
 */
TableCreator.prototype.sync = function(client, cb) {
  var columnsSqls = [SQL_ID_FIELD],
      SequelORM   = require(__dirname + '/'),
      tableName   = this.tableName;

  for (var columnName in this._columns) {
    if (!checkDataType(this._columns[columnName])) {
      cb(new errors.NotADataTypeError('Column ' + columnName + ' is not a valid data type object.'));
      return;
    }
    try {
      columnsSqls.push('`' + jaz.String.underscore(columnName) + '` ' + this._columns[columnName].getSql(columnName));
    } catch(err) {
      cb(err);
      return;
    }
  }
  
  for (var i=0,l=this._uniques.length; i<l; ++i) {
    var keyName = jaz.Object.isArray(this._uniques[i]) ? this._uniques[i].join('_') : this._uniques[i];
    columnsSqls.push('UNIQUE ' + keyName + ' (' + (jaz.Object.isArray(this._uniques[i]) ? this._uniques[i].join(',') : this._uniques[i]) + ')');
  }

  for (var i=0,l=this._foreignKeys.length; i<l; ++i) {
    var keyName   = this._foreignKeys[i][1] + '_id',
        tableName = this._foreignKeys[i][0] + 's';
    columnsSqls.push('FOREIGN KEY (' + keyName + ') REFERENCES `' + tableName + '`');
  }
  
  // TODO log created query
  var sql = jaz.String.interpolate(SQL_CREATE_TABLE, {
    tableName: this.tableName,
    columns:   columnsSqls.join(',')
  });
  SequelORM.log(SequelORM.LOG_LEVEL_INFO, "Sending SQL: " + sql);
  client.query(sql, function(err) {
    if (err) {
      if (err.number === 1050) {
        var errorMessage = "Table '" + tableName + "' already exists.";
        SequelORM.log(SequelORM.LOG_LEVEL_ERROR, "Could not create table '" + tableName + "'. " + errorMessage);
        err = new errors.TableAlreadyExistsError(errorMessage);
      }
      cb(err);
    } else {
      SequelORM.log(SequelORM.LOG_LEVEL_INFO, "Table '" + tableName + "' created");
      cb(null);
    }
  });
  return this;
};

/**
 * Adds a column to the table
 * @method addColumn
 * @param {String} name Name of column to add
 * @param {Object} type Type of column
 */
TableCreator.prototype.addColumn = function(name, type) {
  this._columns[name] = type;
};

/**
 * Adds unique keys
 * @method addUniqueKey
 * @param {String} name Name of column
 */
TableCreator.prototype.addUniqueKey = function(key) {
  this._uniques.push(key);
};

/**
 * Adds column with foreign key
 * @method addBelongsToColumn
 * @param {String} table Name of table (singular) which we will referenc
 * @param {Object} [options] options containing:
 * @param {String} [options.as] Name of column (singular without _id) we use to reference foreign table
 */
TableCreator.prototype.addBelongsToColumn = function(table, options) {
  options = options || {};
  table = jaz.String.underscore(table);
  key   = jaz.String.underscore(options.as || table);
  this.addColumn(key + '_id', types.INT({ allowNull: false }));
  this._foreignKeys.push([table, key]);
};

/**
 * Adds datetime columns for created and updated hooks
 * @method addTimestamps
 */
TableCreator.prototype.addTimestamps = function() {
  this.addColumn('created_at', types.DATETIME());
  this.addColumn('updated_at', types.DATETIME());
};


/**
 * Checks if given object is a valid data type object
 * @method checkDataType
 * @private
 * @param {Object} dataType Type definition
 */
function checkDataType(dataType) {
  return dataType.sql && dataType.type ? true : false;
};


module.exports = TableCreator;

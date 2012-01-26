var EventEmitter     = require('events').EventEmitter,
    jaz              = require('jaz-toolkit'),

    errors           = require(__dirname + '/errors'),
    types            = require(__dirname + '/data_types'),
    
    SQL_UPDATE_TABLE = 'ALTER TABLE #{tableName} #{columns};',
    
    undef;

"use strict";

/**
 * Updates a Table
 * @class TableUpdater
 * @param {String}      tableName Name of the table
 * @param {function}    block block that is called with the Table object
 */
var TableUpdater = function(tableName, block) {
  this._addColumns        = {};
  this._removeColumns     = [];
  this._addUniques        = [];
  this._foreignKeys       = [];
  this._removeForeignKeys = [];
  this._removeKeys        = [];
  this._changeColumns     = {};

  // create testcase for tableName is a modelName and has to be underscored
  this.tableName = tableName;

  block && block(this);
};

/**
 * Makes the SQL query to the database
 * @method sync
 * @param {MysqlClient} client
 * @param {function}    cb Callback to call after finished
 */
TableUpdater.prototype.sync = function(client, cb) {
  var columnsSqls = [],
      SequelORM   = require(__dirname + '/'),
      tableName   = this.tableName,
      type, i, l, columnName, keyName;
  
  for (columnName in this._addColumns) {
    if (!checkDataType(this._addColumns[columnName])) {
      cb(new errors.NotADataTypeError('Column ' + columnName + ' is not a valid data type object.'));
      return;
    }
    try {
      columnsSqls.push('ADD COLUMN `' + jaz.String.underscore(columnName) + '` ' + this._addColumns[columnName].getSql(columnName));
    } catch(err) {
      cb(err);
      return;
    }
  }

  for (i=0,l=this._removeColumns.length; i<l; ++i) {
    columnsSqls.push('DROP COLUMN ' + this._removeColumns[i]);
  }

  for (i=0,l=this._addUniques.length; i<l; ++i) {
    keyName = jaz.Object.isArray(this._addUniques[i]) ? this._addUniques[i].join('_') : this._addUniques[i];
    columnsSqls.push('ADD UNIQUE ' + keyName + ' (' + (jaz.Object.isArray(this._addUniques[i]) ? this._addUniques[i].join(',') : this._addUniques[i]) + ')');
  }

  for (i=0,l=this._removeKeys.length; i<l; ++i) {
    keyName = jaz.Object.isArray(this._removeKeys[i]) ? this._removeKeys[i].join('_') : this._removeKeys[i];
    columnsSqls.push('DROP KEY ' + keyName);
  }

  for (var i=0,l=this._foreignKeys.length; i<l; ++i) {
    var keyName   = this._foreignKeys[i][1] + '_id',
        tableName = this._foreignKeys[i][0] + 's';
    columnsSqls.push('ADD FOREIGN KEY (' + keyName + ') REFERENCES `' + tableName + '`');
  }
  
  for (i=0,l=this._removeForeignKeys.length; i<l; ++i) {
    columnsSqls.push('DROP FOREIGN KEY `' + this._removeForeignKeys[i] + '`');
  }

  for (columnName in this._changeColumns) {
    type = this._changeColumns[columnName].type
    if (type && !checkDataType(type)) {
      cb(new errors.NotADataTypeError('Column ' + columnName + ' is not a valid data type object.'));
      return;
    }
    try {
      columnsSqls.push('CHANGE COLUMN  `' + jaz.String.underscore(columnName) + '` ' + jaz.String.underscore(this._changeColumns[columnName].name) + ' ' + (type ? type.getSql(columnName) : ''));
    } catch(err) {
      cb(err);
      return;
    }
  }

  // TODO log created query
  var sql = jaz.String.interpolate(SQL_UPDATE_TABLE, {
    tableName: this.tableName,
    columns:   columnsSqls.join(',')
  });
  SequelORM.log(SequelORM.LOG_LEVEL_INFO, "Sending SQL: " + sql);
  client.query(sql, function(err) {
    if (err) {
      if (err.number === 1146) {
        var errorMessage = "Table '" + tableName + "' does not exist.";
        SequelORM.log(SequelORM.LOG_LEVEL_ERROR, "Could not update table '" + tableName + "'. " + errorMessage);
        err = new errors.TableNotFoundError(errorMessage);
      } else if (err.number === 1091) {
        err = new errors.ColumnNotFoundError(err.message);
      }
      cb(err);
    } else {
      SequelORM.log(SequelORM.LOG_LEVEL_INFO, "Table '" + tableName + "' updated");
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
TableUpdater.prototype.addColumn = function(name, type) {
  this._addColumns[name] = type;
};

/**
 * Removes a column from the table
 * @method removeColumn
 * @param {String} name Name of column to remove
 */
TableUpdater.prototype.removeColumn = function(name) {
  this._removeColumns.push(name);
};

/**
 * adds a Unique key
 * @method addUniqueKey
 * @param {String} key Name of key to add
 */
TableUpdater.prototype.addUniqueKey = function(key) {
  this._addUniques.push(key);
};

/**
 * Adds column with foreign key
 * @method addBelongsToColumn
 * @param {String} table Name of table (singular) which we will referenc
 * @param {Object} [options] options containing:
 * @param {String} [options.as] Name of column (singular without _id) we use to reference foreign table
 */
TableUpdater.prototype.addBelongsToColumn = function(table, options) {
  options = options || {};
  table = jaz.String.underscore(table);
  key   = jaz.String.underscore(options.as || table);
  this.addColumn(key + '_id', types.INT({ allowNull: false }));
  this._foreignKeys.push([table, key]);
};

/**
 * removes a Unique key
 * @method removeUniqueKey
 */
TableUpdater.prototype.removeUniqueKey = function(key) {
  this._removeKeys.push(key);
};

/**
 * removes a foreign key
 * @method removeBelongsToColumn
 * @param {String} [key] Name of column (singular without _id) we use to reference foreign table
 */
TableUpdater.prototype.removeBelongsToColumn = function(key) {
  var columnName = jaz.String.underscore(key) + '_id';
  this.removeColumn(columnName);
  this._removeForeignKeys.push(columnName);
};

/**
 * Changes a column
 * @method changeColumn
 * @param {String} oldName Name of column we want to change
 * @param {String} newName The new name of the column
 * @param {Object} type    New type definition of column
 */
TableUpdater.prototype.changeColumn = function(oldName, newName, type) {
  this._changeColumns[oldName] = { name: newName, type: type };
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


module.exports = TableUpdater;

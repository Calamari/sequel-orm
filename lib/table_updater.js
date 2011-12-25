var EventEmitter     = require('events').EventEmitter,
    jaz              = require('jaz-toolkit'),

    errors           = require(__dirname + '/errors'),
    
    SQL_UPDATE_TABLE = 'ALTER TABLE #{tableName} #{columns}',
    
    undef;

/**
 * Updates a Table
 * @param {MysqlClient} client
 * @param {String}      tableName Name of the table
 * @param {function}    block block that is called with the Table object
 * @param {function}    cb Callback to call after finished
 */
var TableUpdater = function(client, tableName, block, cb) {
  var columnsSqls = [],
      type, i, l, columnName, keyName;
  
  this._addColumns    = {};
  this._removeColumns = [];
  this._addUniques    = [];
  this._removeKeys    = [];
  this._changeColumns = {};

  block && block(this);
  for (columnName in this._addColumns) {
    if (!checkDataType(this._addColumns[columnName])) {
      cb(new errors.NotADataTypeError('Column ' + columnName + ' is not a valid data type object.'));
      return;
    }
    try {
      columnsSqls.push('ADD COLUMN `' + columnName + '` ' + this._addColumns[columnName].getSql(columnName));
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
  for (columnName in this._changeColumns) {
    type = this._changeColumns[columnName].type
    if (type && !checkDataType(type)) {
      cb(new errors.NotADataTypeError('Column ' + columnName + ' is not a valid data type object.'));
      return;
    }
    try {
      columnsSqls.push('CHANGE COLUMN  `' + columnName + '` ' + this._changeColumns[columnName].name + ' ' + (type ? type.getSql(columnName) : ''));
    } catch(err) {
      cb(err);
      return;
    }
  }

  // TODO log created query
  var sql = jaz.String.interpolate(SQL_UPDATE_TABLE, {
    tableName: tableName,
    columns:   columnsSqls.join(',')
  });
  client.query(sql, function(err) {
    if (err) {
      cb(
        err.number === 1146 ?
          new errors.TableNotFoundError("Table '" + tableName + "' does not exist.") : 
          err.number === 1091 ? 
            new errors.ColumnNotFoundError(err.message) : 
          err
      );
    } else {
      cb(null);
    }
  });
};

/**
 * Adds a column to the table
 */
TableUpdater.prototype.addColumn = function(name, type) {
  this._addColumns[name] = type;
};

/**
 * Removes a column from the table
 */
TableUpdater.prototype.removeColumn = function(name) {
  this._removeColumns.push(name);
};

/**
 * adds a Unique key
 */
TableUpdater.prototype.addUniqueKey = function(key) {
  this._addUniques.push(key);
};

/**
 * removes a Unique key
 */
TableUpdater.prototype.removeUniqueKey = function(key) {
  this._removeKeys.push(key);
};

/**
 * Changes a column
 */
TableUpdater.prototype.changeColumn = function(oldName, newName, type) {
  this._changeColumns[oldName] = { name: newName, type: type };
};


/**
 * Checks if given object is a valid data type object
 */
function checkDataType(dataType) {
  return dataType.sql && dataType.type ? true : false;
};


module.exports = TableUpdater;

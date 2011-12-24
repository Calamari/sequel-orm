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
  var columnsSqls = [];
  
  this._addColumns = {};

  block && block(this);
  for (var columnName in this._addColumns) {
    if (!checkDataType(this._addColumns[columnName])) {
      cb(new errors.NotADataTypeError('Column ' + columnName + ' is not a valid data type object.'));
      return;
    }
    try {
      columnsSqls.push('ADD COLUMN ' + this._addColumns[columnName].getSql(columnName));
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
      cb(err.number === 1146 ? new errors.TableNotFoundError("Table '" + tableName + "' does not exist.") : err);
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
 * Checks if given object is a valid data type object
 */
function checkDataType(dataType) {
  return dataType.sql && dataType.type ? true : false;
};


module.exports = TableUpdater;

var EventEmitter     = require('events').EventEmitter,
    jaz              = require('jaz-toolkit'),

    errors           = require(__dirname + '/errors'),
    
    SQL_CREATE_TABLE = 'CREATE TABLE #{tableName} (#{columns});',
    SQL_ID_FIELD     = '`id` INT(11) AUTO_INCREMENT PRIMARY KEY',
    SQL_FIELD        = '`#{name}` #{typeSql} #{extras}',
    
    undef;

var Table = function(client, tableName, block, cb) {
  this._columns = [];
  var columnsSqls = [SQL_ID_FIELD];
  block && block(this);
  for (var columnName in this._columns) {
    if (!checkForDataType(this._columns[columnName])) {
      cb(new errors.NotADataTypeError('Column ' + columnName + ' is not a valid data type object.'));
      return;
    }
    var columnData = this._columns[columnName].defaultOptions || {};
    columnsSqls.push(jaz.String.interpolate(SQL_FIELD, {
      name:    columnName,
      typeSql: jaz.String.interpolate(this._columns[columnName].sql, columnData),
      extras:  ''
    }));
  }
  client.query(jaz.String.interpolate(SQL_CREATE_TABLE, { tableName: tableName, columns: columnsSqls.join(',') }), cb);
};

Table.prototype.addColumn = function(name, type) {
  this._columns[name] = type;
};

/**
 * Checks if given object is a valid data type object
 */
function checkForDataType(dataType) {
  return dataType.sql && dataType.type ? true : false;
};


module.exports = {
  /**
   * Creates a Table instance
   * @param {MysqlClient} client
   * @param {String}      tableName Name of the table
   * @param {function}    block block that is called with the Table object
   * @param {function}    cb Callback to call after finished
   */
  create: function(client, tableName, block, cb) {
    if (cb == undef) {
      cb = block;
      block = null;
    }
    return new Table(client, tableName, block, cb);
  }
};

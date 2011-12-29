var EventEmitter     = require('events').EventEmitter,
    jaz              = require('jaz-toolkit'),

    errors           = require(__dirname + '/errors'),
    types            = require(__dirname + '/data_types'),
    
    SQL_CREATE_TABLE = 'CREATE TABLE #{tableName} (#{columns});',
    SQL_ID_FIELD     = '`id` INT(11) AUTO_INCREMENT PRIMARY KEY',
    
    undef;

/**
 * Creates a Table instance
 * @param {String}      tableName Name of the table
 * @param {function}    block block that is called with the Table object
 */
var TableCreator = function(tableName, block) {
  this._columns = {};
  this._uniques = [];

  this.tableName = jaz.String.underscore(tableName);

  block && block(this);
};

/**
 * Calls the MySQL database and create the table
 * @param {MysqlClient} client
 * @param {function}    cb Callback to call after finished
 */
TableCreator.prototype.sync = function(client, cb) {
  var columnsSqls = [SQL_ID_FIELD];

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
  
  // TODO log created query
  var sql = jaz.String.interpolate(SQL_CREATE_TABLE, {
    tableName: this.tableName,
    columns:   columnsSqls.join(',')
  });
  client.query(sql, function(err) {
    if (err) {
      cb(err.number === 1050 ? new errors.TableAlreadyExistsError("Table '" + this.tableName + "' already exists.") : err);
    } else {
      cb(null);
    }
  });
  return this;
};

/**
 * Adds a column to the table
 */
TableCreator.prototype.addColumn = function(name, type) {
  this._columns[name] = type;
};

/**
 * Adds unique keys
 */
TableCreator.prototype.addUniqueKey = function(key) {
  this._uniques.push(key);
};

/**
 * Adds datetime columns for created and updated hooks
 */
TableCreator.prototype.addTimestamps = function() {
  this.addColumn('created_at', types.DATETIME());
  this.addColumn('updated_at', types.DATETIME());
};


/**
 * Checks if given object is a valid data type object
 */
function checkDataType(dataType) {
  return dataType.sql && dataType.type ? true : false;
};


module.exports = TableCreator;
var EventEmitter     = require('events').EventEmitter,
    jaz              = require('jaz-toolkit'),

    errors           = require(__dirname + '/errors'),
    
    SQL_DROP_TABLE   = 'DROP TABLE #{tableName}',
    
    undef,

    TableCreator = require(__dirname + '/table_creator'),
    TableUpdater = require(__dirname + '/table_updater');


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
    var tableCreator = new TableCreator(tableName, block);
    return tableCreator.sync(client, cb);
  },

  /**
   * Updates a Table
   * @param {MysqlClient} client
   * @param {String}      tableName Name of the table
   * @param {function}    block block that is called with the Table object
   * @param {function}    cb Callback to call after finished
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
   * Drops a Table
   * @param {MysqlClient} client
   * @param {String}      tableName Name of the table
   * @param {function}    cb Callback to call after finished
   */
  drop: function(client, tableName, cb) {
    client.query(jaz.String.interpolate(SQL_DROP_TABLE, { tableName: tableName }), cb);
  }
};

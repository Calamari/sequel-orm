var EventEmitter     = require('events').EventEmitter,
    mysql            = require('mysql'),

    errors           = require(__dirname + '/errors'),
    Table            = require(__dirname + '/table'),

    undef;

"use strict";

/**
 * Creates an instanciated SequelORM object you can use to communicate with your database.
 * All sql commands used, before it connection is made will be executed when connection is ready.
 *
 * @class Connector
 * @param {Object}  config            Configuration object:
 * @param {Integer} [config.port]     Port of database
 * @param {String}  [config.host]     Host of database
 * @param {String}  config.user       User for connecting
 * @param {String}  config.password   Password for connecting
 * @param {String}  config.database   Database to connect to
 */
module.exports = function connector(config) {
  if (config === undef) throw errors.MissingArgumentsError('You have to set the connection config for your Connector instance.');

  // the returned instance object
  var object  = new Object(),

      // private vars
      _client = mysql.createClient(config),
      Seq     = require(__dirname + '/..');

  Seq.log(Seq.LOG_LEVEL_INFO, "Connection defined to database '" + _client.database + "' on " + _client.host + ':' + _client.port);

  object.prototype = EventEmitter.prototype;

  /**
   * Executes a raw sql query via mysql client
   * @method query
   */
  object.query = function(query, params, cb) {
    _client.query(query, params, cb);
  };

  /**
   * Creates a Table
   * @method createTable
   * @param {String}   tableName Name of table
   * @param {function} [block]   Block function that takes table object as parameter
   * @param {function} [cb]      Callback called after table is created
   * @return {TableCreator}
   */
  object.createTable = function(tableName, block, cb) {
    return Table.create(_client, tableName, block, cb);
  };

  /**
   * Updates a Table
   * @method updateTable
   * @param {String}   tableName Name of table
   * @param {function} [block]   Block function that takes table object as parameter
   * @param {function} [cb]      Callback called after table is updated
   * @return {TableUpdater}
   */
  object.updateTable = function(tableName, block, cb) {
    return Table.update(_client, tableName, block, cb);
  };

  /**
   * Drops a Table
   * @method dropTable
   * @param {String}   tableName Name of table
   * @param {function} [cb]      Callback called after table is deleted
   */
  object.dropTable = function(tableName, cb) {
    Table.drop(_client, tableName, cb);
  };

  /**
   * Creates a join table between two tables
   * @method createManyToManyAssociationTable
   * @param {String}   tableName1 Name of the first table for connection
   * @param {String}   tableName2 Name of the second table for connection
   * @param {function} [cb]       Callback called after join table is deleted
   */
  object.createManyToManyAssociationTable = function(tableName1, tableName2, cb) {
    Table.createManyToManyAssociationTable(_client, tableName1, tableName2, cb);
  };

  /**
   * Removes the join table joining two tables
   * @method dropManyToManyAssociationTable
   * @param {String}   tableName1 Name of the first table for connection
   * @param {String}   tableName2 Name of the second table for connection
   * @param {function} [cb]       Callback called after join table is removed
   */
  object.dropManyToManyAssociationTable = function(tableName1, tableName2, cb) {
    Table.dropManyToManyAssociationTable(_client, tableName1, tableName2, cb);
  };

  /**
   * Closes the connection
   * @method close
   */
  object.close = function(cb) {
    _client.end(cb);
  };

  object.__defineGetter__('isConnected', function() { return _client && _client.connected; });
  return object;
};

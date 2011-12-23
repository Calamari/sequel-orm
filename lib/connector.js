var EventEmitter     = require('events').EventEmitter,
    mysql            = require('mysql'),

    errors           = require(__dirname + '/errors'),
    Table            = require(__dirname + '/table'),
    
    undef;

/**
 * Creates an instanciated SequelORM object you can use to communicate with your database.
 * All sql commands used, before it connection is made will be executed when connection is ready.
 *
 * @param {Object}  config            Configuration object:
 * @param {Integer} [config.port]     Port of database
 * @param {String}  [config.host]     Host of database
 * @param {String}  config.user       User for connecting
 * @param {String}  config.password   Password for connecting
 * @param {String}  config.database   Database to connect to
 */
module.exports = function(config) {
  if (config === undef) throw errors.MissingArgumentsError('You have to set the connection config for your Connector instance.');

  // the returned instance object
  var object = new Object(),
  // private vars
     _isConnected = false,
     _client = mysql.createClient(config);
  
  object.prototype = EventEmitter.prototype;

  /**
   * Executes a raw sql query via mysql client
   */
  object.query = function(query, params, cb) {
    _client.query(query, params, cb);
  };
  
  object.createTable = function(tableName, block, cb) {
    return Table.create(_client, tableName, block, cb);
  };
     
  object.__defineGetter__('isConnected', function() { return _client && _client.connected; })
  return object;
};

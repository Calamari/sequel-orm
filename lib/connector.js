var errors = require(__dirname + '/errors'),
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
};

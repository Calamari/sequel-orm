"use strict";

/**
 * Index file, loads all there is to load
 */
var jaz          = require('jaz-toolkit'),
    EventEmitter = require('events').EventEmitter,

    Connector    = require(__dirname + '/connector'),
    Model        = require(__dirname + '/model'),
    Table        = require(__dirname + '/table'),
    helpers      = require(__dirname + '/helpers'),
    
    models       = {},
    queryQueue   = [],
    connector;

var makeQuery = function(query, params, cb) {
  if (connector) {
    SequelORM.log(SequelORM.LOG_LEVEL_INFO, "Sending SQL: " + query);
    connector.query(query, params, cb);
  } else {
    queryQueue.push(arguments);
  }
  // TODO: test late execution
  // TODO: sql query logs here!
};

/**
 * The SequelORM main object
 * Noteworthy:
 *   id column is fixed for the moment
 * @module SequelORM
 */
var SequelORM = {
  LOG_LEVEL_INFO:  'info',
  LOG_LEVEL_WARN:  'warn',
  LOG_LEVEL_ERROR: 'error',

  /**
   * Creates an instanciated SequelORM object you can use to communicate with your database.
   * All sql commands used, before it connection is made will be executed when connection is ready.
   * @module create
   */
  create: function(config) {
    var query;
    connector = Connector(config);
    while (queryQueue.length) {
      makeQuery.apply(this, queryQueue.shift());
    }
    return connector;
  },

  query: function() {
    makeQuery.apply(this, arguments);
  },

  /**
   * Creates an instanciated SequelORM object you can use to communicate with your database.
   * Of if one already exists, it will return that
   * @module createIfNotExistent
   */
  createIfNotExistent: function(config) {
    if (connector) {
      return connector;
    }
    return this.create(config);
  },
  
  /**
   * Removes Connector and destroys connection
   * @module removeConnection
   */
  removeConnection: function(cb) {
    if (connector) {
      connector.close(cb);
      connector = null;
    }
  },

  /**
   * Emits a log event
   * @module log
   * @param {String} level   Log level ('info', 'warn', 'error')
   * @param {String} message Log message
   */
  log: function(level, message) {
    this.emit('log', level, message);
  },

  /**
   * Creates a model
   * All sql commands used, before it connection is made will be executed when connection is ready.
   * @module defineModel
   */
  defineModel: function(name, structure, definition) {
    name = jaz.String.firstCharUpperCase(jaz.String.camelize(name));
    models[name] = new Model(name, structure, definition, makeQuery);
    this.emit('model_defined', models[name]);
    return models[name];
  },
  
  /**
   * Gets model definition
   * @module getModel
   */
  getModel: function(name) {
    return models[name] || null;
  },

  /**
   * Remove model definition
   * @module removeModel
   */
  removeModel: function(name) {
    models[name] = null;
    delete models[name];
  },

  /**
   * Creates a table migration
   * @module removeModel
   * @return {TableMigrator}
   */
  createTable: function(tableName, block) {
    return Table.migrate(tableName, block, 'create');
  },

  /**
   * Creates a table migration for updating a table
   * @module removeModel
   * @param {String}   modelName Name of the model
   * @param {function} block     Function for creating the table
   * @return {TableMigrator}
   */
  updateTable: function(tableName, block) {
    return Table.migrate(tableName, block, 'update');
  },

  /**
   * Returns table definition from migrations
   * @module removeModel
   * @param {String} modelName Name of the model
   * @return {TableMigrator}
   */
  getTableFromMigration: function(modelName) {
    // same as in model.js
    var tableName = helpers.pluralize(jaz.String.underscore(modelName)),
        migrator  = Table.getTableMigrator(tableName);
    
    return migrator ? migrator.getDefinition() : null;
  },
  
  /**
   * Clears all table definitions
   * @module clearTableDefinitions
   */
  clearTableDefinitions: function() {
    Table.clearMigrations();
  },

  /**
   * All SequelORM error definitions
   * @property errors
   */
  errors:    require(__dirname + '/errors'),
  
  /**
   * Default data type definitions
   * @property dataTypes
   */
  dataTypes: require(__dirname + '/data_types')
};

module.exports = jaz.Object.extend(SequelORM, new EventEmitter());

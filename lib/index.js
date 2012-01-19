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
 * Noteworthy:
 *   id column is fixed for the moment
 */
var SequelORM = {
  LOG_LEVEL_INFO:  'info',
  LOG_LEVEL_WARN:  'warn',
  LOG_LEVEL_ERROR: 'error',

  /**
   * Creates an instanciated SequelORM object you can use to communicate with your database.
   * All sql commands used, before it connection is made will be executed when connection is ready.
   */
  create: function(config) {
    var query;
    connector = Connector(config);
    while (queryQueue.length) {
      makeQuery.apply(this, queryQueue.shift());
    }
    return connector;
  },

  /**
   * Creates an instanciated SequelORM object you can use to communicate with your database.
   * Of if one already exists, it will return that
   */
  createIfNotExistent: function(config) {
    if (connector) {
      return connector;
    }
    return this.create(config);
  },
  
  /**
   * Removes Connector and destroys connection
   */
  removeConnection: function(cb) {
    if (connector) {
      connector.close(cb);
      connector = null;
      delete connector;
    }
  },

  /**
   * Emits a log event
   * @param {String} level   Log level ('info', 'warn', 'error')
   * @param {String} message Log message
   */
  log: function(level, message) {
    this.emit('log', level, message);
  },

  /**
   * Creates a model
   * All sql commands used, before it connection is made will be executed when connection is ready.
   */
  defineModel: function(name, structure, definition) {
    name = jaz.String.firstCharUpperCase(jaz.String.camelize(name));
    models[name] = new Model(name, structure, definition, makeQuery);
    this.emit('model_defined', models[name]);
    return models[name];
  },
  
  getModel: function(name) {
    return models[name] || null;
  },
  removeModel: function(name) {
    models[name] = null;
    delete models[name];
  },
  createTable: function(tableName, block) {
    return Table.migrate(tableName, block, 'create');
  },

  updateTable: function(tableName, block) {
    return Table.migrate(tableName, block, 'update');
  },

  getTableFromMigration: function(modelName) {
    // same as in model.js
    var tableName = helpers.pluralize(jaz.String.underscore(modelName)),
        migrator  = Table.getTableMigrator(tableName);
    
    return migrator ? migrator.getDefinition() : null;
  },
  
  clearTableDefinitions: function() {
    Table.clearMigrations();
  },

  /**
   * All our error definitions
   */
  errors:    require(__dirname + '/errors'),
  
  /**
   * Default data type definitions
   */
  dataTypes: require(__dirname + '/data_types')
};

module.exports = jaz.Object.extend(SequelORM, new EventEmitter());

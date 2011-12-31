/**
 * Index file, loads all there is to load
 */
var jaz        = require('jaz-toolkit'),

    Connector  = require(__dirname + '/connector'),
    Model      = require(__dirname + '/model'),
    Table      = require(__dirname + '/table'),
    
    models     = {},
    queryQueue = [],
    connector;

var makeQuery = function(query, params, cb) {
  if (connector) {
    connector.query(query, params, cb);
  } else {
    queryQueue.push(arguments);
  }
  // TODO: test late execution
};

/**
 * Noteworthy:
 *   id column is fixed for the moment
 */
module.exports = {
  /**
   * Creates an instanciated SequelORM object you can use to communicate with your database.
   * All sql commands used, before it connection is made will be executed when connection is ready.
   */
  create: function(config) {
    var query;
    connector = Connector(config);
    while (queryQueue.length) {
      connector.query.apply(this, queryQueue.shift());
      
    }
    return connector;
  },
  
  /**
   * Removes Connector and destroys connection
   */
  removeConnection: function(cb) {
    if (connector) {
      connector.close(cb);
      delete connector;
      connector = null;
    }
  },
  
  /**
   * Creates a model
   * All sql commands used, before it connection is made will be executed when connection is ready.
   */
  defineModel: function(name, structure, definition) {
    models[name] = new Model(name, structure, definition, makeQuery);
    return models[name];
  },
  
  getModel: function(name) {
    return models[name] || null;
  },
  createTable: function(tableName, block) {
    return Table.migrate(tableName, block, 'create');
  },

  updateTable: function(tableName, block) {
    return Table.migrate(tableName, block, 'update');
  },

  getTableFromMigration: function(modelName) {
    // same as in model.js
    var tableName = jaz.String.underscore(modelName);
    if (!tableName.match(/s$/)) {
      tableName += 's';
    }
    var migrator = Table.getTableMigrator(tableName);
    
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


/*
  Prio list:
    - ORM stuff:
      generate model from migrations
      secure input against evil
  
  Some TODOS:
    - much....
    - enums
    (- set autoincrement and give option to remove automatic id column) 
    - ZEROFILL
    - COMMENT
    - logging
    - datetime extras
    - TableMigrator should be able to create syncs and replace TableCreator and TableUpdater
    - creating of own default dataTypes
*/
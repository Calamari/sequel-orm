/**
 * Index file, loads all there is to load
 */
var Connector = require(__dirname + '/connector'),
    Model     = require(__dirname + '/model');

module.exports = {
  /**
   * Creates an instanciated SequelORM object you can use to communicate with your database.
   * All sql commands used, before it connection is made will be executed when connection is ready.
   */
  create: function(config) {
    return Connector(config);
  },
  
  /**
   * Creates a model
   * All sql commands used, before it connection is made will be executed when connection is ready.
   */
  defineModel: function(name, definition) {
    return new Model(name, definition);
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
    - Migration stuff:
      test camelizing
    - ORM stuff:
      ...
      secure input against evil
  
  Some TODOS:
    - much....
    - enums
    - removeColumn
    (- set autoincrement and give option to remove automatic id column) 
    - ZEROFILL
    - COMMENT
    - logging
    - datetime extras
*/
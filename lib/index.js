/**
 * Index file, loads all there is to load
 */
var Connector = require(__dirname + '/connector');

module.exports = {
  /**
   * Creates an instanciated SequelORM object you can use to communicate with your database.
   * All sql commands used, before it connection is made will be executed when connection is ready.
   */
  create: function(config) {
    return Connector(config);
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
      removeColumn
      changeColumn
      createdAt, updatedAt default columns
    - ORM stuff:
      ...
  
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
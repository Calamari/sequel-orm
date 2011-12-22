/**
 * Standard defined DataTypes to use in MySQL
 */

module.exports = {
  INT: {
    type: 'integer',
    sql: 'INT(#{length})',
    defaultOptions: { length: 11 },
    validation: function(val) {
      return ~~val === val;
    }
  },
  VARCHAR: {
    type: 'varchar',
    sql: 'VARCHAR(#{length})',
    defaultOptions: { length: 255 },
    validation: function(val) {
      return typeof val === 'string';
    }
  },
  TEXT: {
    type: 'text',
    sql: 'TEXT',
    validation: function(val) {
      return typeof val === 'string';
    }
  },
  BOOLEAN: {
    type: 'boolean',
    sql: 'INT(1)',
    validation: function(val) {
      return typeof val === 'boolean';
    }
  },
  FLOAT: {
    type: 'float',
    sql: 'FLOAT',
    validation: function(val) {
      return typeof val === 'number' && !isNaN(val);
    }
  },
  DATETIME: {
    type: 'datetime',
    sql: 'DATETIME',
    validation: function(val) {
      return typeof val === 'object' && val && val.constructor === Date;
    }
  }
}

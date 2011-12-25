var jaz = require('jaz-toolkit'),

    errors           = require(__dirname + '/errors'),

    SQL_FIELD        = '#{typeSql} #{extras}',
    
    undef;

/**
 * Standard defined DataTypes to use in MySQL
 * Options can be one of the following: length, allowNull, unique
 */

var types = {
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
};

jaz.Object.each(types, function(type, name) {
  module.exports[name] = function(options) {
    var def = jaz.Object.extend({}, types[name]);
    def.options = jaz.Object.extend({}, def.defaultOptions, options);
    
    def.getSql = function(columnName) {
      var extras = [];
      extras.push(def.options.allowNull ? 'NULL' : 'NOT NULL');
      if (def.options.default) {
        if (def.type === 'datetime') throw new errors.DefaultValueForbiddenError('Datetime columns (' + columnName + ') can not have a default value.');
        extras.push('DEFAULT ' + (typeof def.options.default === 'string' ? "'" + def.options.default + "'" : def.options.default));
      }
      if (def.options.unique) {
        extras.push('UNIQUE KEY');
      }
      return jaz.String.interpolate(SQL_FIELD, {
        name:    columnName,
        typeSql: jaz.String.interpolate(def.sql, def.options),
        extras:  extras.join(' ')
      });
    };
    return def;
  };
});
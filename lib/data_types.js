var jaz       = require('jaz-toolkit'),

    errors    = require(__dirname + '/errors'),

    SQL_FIELD = '#{typeSql} #{extras}',

    defaultSaveMethod = function(val) { return val; },
    defaultLoadMethod = function(val) { return val; },

    undef;

/**
 * Standard defined DataTypes to use in MySQL
 * Options can be one of the following: length, allowNull, unique
 * @module DataTypes
 */

var types = {
  /**
   * Stores Integer values
   * @class INT
   */
  INT: {
    type: 'integer',
    sql: 'INT(#{length})',
    defaultOptions: { length: 11 },
    validation: function(val) {
      return ~~val === val;
    }
  },
  /**
   * Stores string up to 255 characters
   * @class VARCHAR
   */
  VARCHAR: {
    type: 'varchar',
    sql: 'VARCHAR(#{length})',
    defaultOptions: { length: 255 },
    validation: function(val) {
      return typeof val === 'string';
    }
  },
  /**
   * Stores text
   * @class TEXT
   */
  TEXT: {
    type: 'text',
    sql: 'TEXT',
    validation: function(val) {
      return typeof val === 'string';
    }
  },
  /**
   * Stores a boolean value
   * @class BOOLEAN
   */
  BOOLEAN: {
    type: 'boolean',
    sql: 'INT(1)',
    validation: function(val) {
      return typeof val === 'boolean';
    }
  },
  /**
   * Stores a floating point number
   * @class FLOAT
   */
  FLOAT: {
    type: 'float',
    sql: 'FLOAT',
    validation: function(val) {
      return typeof val === 'number' && !isNaN(val);
    }
  },
  /**
   * Stores a datetime value
   * @class DATETIME
   */
  DATETIME: {
    type: 'datetime',
    sql: 'DATETIME',
    validation: function(val) {
      return typeof val === 'object' && val && val.constructor === Date;
    },
    save: function(val) {
      return jaz.Date.toMySQLString(val);
    },
    load: function(val) {
      // node_mysql does not get back the DATETIME string as we would expect,
      // instead it returns a Date object, using given UTC time and thinks about it as it will be
      // a time of this timezone
      //return jaz.Date.fromMySQLString(val);
      // so the solution is this instead:
      val.setUTCMinutes(val.getUTCMinutes() - val.getTimezoneOffset());
      return val;
    }
  },
  /**
   * Stores a varchar using an enumeration
   * @class FLOAT
   */
  ENUM: {
    type: 'enum',
    sql: function() { return 'ENUM(' + (this.values || []).join(', ') + ')'; },
    validation: function(val) {
      return jaz.Array.include(this.values, val);
    }
  }
};

jaz.Object.each(types, function(type, name) {
  module.exports[name] = function(options) {
    options = options || {};
    var def = jaz.Object.extend({
      save: options.save || defaultSaveMethod,
      load: options.load || defaultLoadMethod,
    }, types[name]);
    def.options = jaz.Object.extend({}, def.defaultOptions, options);
    def.equals = function(other) {
      return this.type === other.type && jaz.Object.isEqual(this.options, other.options);
    };

    def.sql = jaz.Object.isFunction(def.sql) ? def.sql.apply(def.options) : def.sql;
    def.validation = def.validation.bind(def.options);

    def.getSql = function(columnName) {
      var extras       = [],
          defaultValue = def.options['default'];
      extras.push(def.options.allowNull ? 'NULL' : 'NOT NULL');
      if (defaultValue) {
        if (def.type === 'datetime') throw new errors.DefaultValueForbiddenError('Datetime columns (' + columnName + ') can not have a default value.');
        extras.push('DEFAULT ' + (typeof defaultValue === 'string' ? "'" + defaultValue + "'" : defaultValue));
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

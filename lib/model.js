var mysql            = require('mysql'),
    jaz              = require('jaz-toolkit'),

    errors           = require(__dirname + '/errors'),
    types            = require(__dirname + '/data_types'),
    
    undef,
    
    QUERY_FIND_FIRST = 'SELECT * FROM `#{tableName}` #{limit};',
    QUERY_FIND_ID    = 'SELECT * FROM `#{tableName}` WHERE id=? #{limit};',
    QUERY_FIND_WHERE = 'SELECT * FROM `#{tableName}` #{where} #{order} #{limit};',
    QUERY_INSERT     = 'INSERT INTO `#{tableName}` (#{columns}) VALUES (#{values});',
    QUERY_UPDATE     = 'UPDATE `#{tableName}` SET #{values} WHERE id=#{id};'
;

var Model = function(name, structure, modelDefinition, query) {
  var tableName = jaz.String.underscore(name),
      fields;
  modelDefinition = modelDefinition || {};
  if (!tableName.match(/s$/)) {
    tableName += 's';
  }

  if (!structure.id) {
    structure.id = types.INT();
  }
  fields = Object.keys(structure);

  this.__defineGetter__('name', function() { return name; });
  this.__defineGetter__('tableName', function() { return tableName; });
  this.__defineGetter__('fields', function() {
    return fields;
  });

  // set class methods
  if (modelDefinition.classMethods) {
    for (var methodName in modelDefinition.classMethods) {
      this[methodName] = modelDefinition.classMethods[methodName];
    }
  }

  /**
   * Finds one database record that matches either id or where clause
   * @param {Integer|Object} [search] id or search parameters
   * @param {function}       [cb]     Callback to call after query has finished
   */
  this.find = function(search, cb) {
    var createMethod = this.create,
        params = [],
        sql = '',
        id = null;
    if (typeof search === 'function') {
      // no search parameter given
      cb = search;
      sql = jaz.String.interpolate(QUERY_FIND_FIRST, { tableName: tableName });
    } else if (typeof search === 'number') {
      // search parameter is an id
      id = search;
      params = [ id ];
      sql = jaz.String.interpolate(QUERY_FIND_ID, { tableName: tableName });
    } else if (typeof search === 'object') {
      sql = jaz.String.interpolate(QUERY_FIND_WHERE, {
        tableName: tableName,
        where: search.where ? 'WHERE ' + search.where : '',
        order: search.order ? 'ORDER BY ' + search.order : ''
      });
    }
    sql = jaz.String.interpolate(sql, { limit: 'LIMIT 1' });
    query(sql, params, function(err, result) {
      if (!err) {
        err = null;
        var record = null,
            recordData = {};
        if (result.length) {
          for (var key in result[0]) {
            recordData[jaz.String.camelize(key)] = result[0][key];
          }
          record = createMethod(recordData);
        } else {
          var recordId = '';
          if (id) {
            recordId = 'id=' + id;
          } else {
            recordId = 'where clause (' + search.where + ')';
          }
          err = new errors.ItemNotFoundError('Record `' + name + '` with id=' + id + ' not found!');
        }
        cb(err, record);
      } else {
        cb(err);
      }
    });
  };
  
  this.create = function(data) {
    var instance = {},
        isNew    = true,
        isDirty  = true;

    // set getter and setter for data
    jaz.Object.each(structure, function(def, key) {
      instance.__defineGetter__(key, function() { return data[key]; });
      instance.__defineSetter__(key, function(value) { data[key] = value; isDirty = true; });
    });

    // set instance methods
    if (modelDefinition.instanceMethods) {
      for (var methodName in modelDefinition.instanceMethods) {
        instance[methodName] = modelDefinition.instanceMethods[methodName];
      }
    }

    instance.__defineGetter__('isNew', function() { return isNew; });
    instance.__defineGetter__('isDirty', function() { return isDirty; });
    
    /**
     * Returns all defined data
     */
    instance.getData = function() {
      return data;
    };

    /**
     * Saves the instance to the database
     */
    instance.save = function(cb) {
      if (structure.createdAt && isNew) {
        instance.createdAt = new Date();
      }
      if (structure.updatedAt) {
        instance.updatedAt = new Date();
      }
      var columns = [],
          values  = [],
          params  = [],
          sql, i, l;
      if (isNew) {
        for (i=0,l=fields.length; i<l; ++i) {
          if (fields[i] !== 'id') {
            columns.push(jaz.String.underscore(fields[i]));
            values.push('?');
            params.push(data[fields[i]] || null);
          }
        }
        sql = jaz.String.interpolate(QUERY_INSERT, {
          tableName: tableName,
          columns: columns.join(','),
          values: values.join(',')
        });
      } else {
        for (i=0,l=fields.length; i<l; ++i) {
          if (fields[i] !== 'id') {
            values.push(jaz.String.underscore(fields[i]) + ' = ?');
            params.push(data[fields[i]] || null);
          }
        }
        sql = jaz.String.interpolate(QUERY_UPDATE, {
          tableName: tableName,
          values: values.join(','),
          id: instance.id
        });
      }
      query(sql, params, function(err, result) {
        if (!err) {
          if (isNew) {
            instance.id = result.insertId;
          }
          isNew = false;
          isDirty = false;
        }
        cb(err || null, instance);
      });
    };

    return instance;
  };
};

module.exports = Model;
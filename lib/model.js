var mysql            = require('mysql'),
    jaz              = require('jaz-toolkit'),

    errors           = require(__dirname + '/errors'),
    types            = require(__dirname + '/data_types'),
    
    undef,
    
    QUERY_FIND_WHERE = 'SELECT * FROM `#{tableName}` #{where} #{order} #{limit};',
    QUERY_INSERT     = 'INSERT INTO `#{tableName}` (#{columns}) VALUES (#{values});',
    QUERY_DELETE     = 'DELETE FROM `#{tableName}` WHERE id=?;',
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

  // check validators for validity
  var options;
  for (var columnName in structure) {
    options = structure[columnName].options;
    if (options.validation) {
      if (typeof options.validation === 'object') {
        for (var validatorName in options.validation) {
          if (typeof options.validation[validatorName] !== 'function') {
            throw new errors.NotAValidatorError("Not a validator method as validation '" + validatorName + "' given in " + name + "." + columnName);
          }
        }
      } else if (typeof options.validation !== 'function') {
        throw new errors.NotAValidatorError("Not a validator method as validation given in " + name + "." + columnName);
      }
    }
  }

  /**
   * Intern worker method that finds all matching database records that matches where clause
   * @param {Integer|Object} search     id or search parameters
   * @param {Array}          [userParams] Array of replacements for ? in query
   * @param {function}       [cb]         Callback to call after query has finished
   */
  var _find = function(search, userParams, cb) {
    var params = [],
        sql = '',
        id = null;

    if (typeof userParams === 'function') {
      cb = userParams;
      userParams = undef;
    }
    if (typeof search === 'object') {
      sql = jaz.String.interpolate(QUERY_FIND_WHERE, {
        tableName: tableName,
        where: search.where ? 'WHERE ' + search.where : '',
        order: search.order ? 'ORDER BY ' + search.order : ''
      });
      params = userParams || [];
    }
    sql = jaz.String.interpolate(sql, { limit: search.limit ? 'LIMIT ' + search.limit : '' });
    query(sql, params, function(err, results) {
      if (!err) {
        cb(null, results);
      } else {
        cb(err);
      }
    });
  };

  /**
   * Finds one database record that matches either id or where clause
   * The search param as object could have the following properties:
   *      {String} where The where clause of the sql (enhanced with ? for security)
   *      {String} order The order clause of the sql
   *      {String} limit The limit clause of the sql
   * @param {Integer|Object} [search]     id or search parameters
   * @param {Array}          [userParams] Array of replacements for ? in query
   * @param {function}       [cb]         Callback to call after query has finished
   */
  this.find = function(search, userParams, cb) {
    var createMethod = this.create;
    if (typeof userParams === 'function') {
      cb = userParams;
      userParams = [];
    }
    if (typeof search === 'function') {
      // no search parameter given
      cb = search;
      search = {};
    } else if (typeof search === 'number') {
      // search parameter is an id
      id = search;
      search = { where: 'ID=?' };
      userParams.push(id);
    }
    search.limit = 1;
    _find(search, userParams, function(err, results) {
      if (err) {
        cb(err, null);
      } else {
        var record     = null,
            recordData = {};

        if (results.length) {
          for (var key in results[0]) {
            recordData[jaz.String.camelize(key)] = results[0][key];
          }
          record = createMethod(recordData, true);
          cb(null, record);
        } else {
          var recordId = '';
          if (id) {
            recordId = 'id=' + id;
          } else {
            recordId = 'where clause (' + search.where + ')';
          }
          err = new errors.ItemNotFoundError('Record `' + name + '` with id=' + id + ' not found!');
          cb(err);
        }
      }
    });
  };
  
  var _findAll = function(resultHash, search, userParams, cb) {
    var createMethod = this.create;
    if (typeof search === 'function') {
      cb = search;
      userParams = [];
      search     = {};
    } else if (typeof userParams === 'function') {
      cb = userParams;
      userParams = [];
    }
    _find(search, userParams, function(err, results) {
      if (err) {
        cb(err, null);
      } else {
        var records       = resultHash ? {} : [],
            resultsLength = results.length,
            hashKey       = search.key || 'id',
            recordData, key;

        if (structure[hashKey]) {
          if (resultsLength) {
            for (var i=0; i<resultsLength; ++i) {
              recordData = {};
              for (key in results[i]) {
                recordData[jaz.String.camelize(key)] = results[i][key];
              }
              if (resultHash) {
                records[recordData[hashKey]] = createMethod(recordData, true);
              } else {
                records.push(createMethod(recordData, true));
              }
            }
          }
          cb(null, records);
        } else {
          cb(new errors.NotValidColumnError("Key '" + search.key + "' is not a valid Column in table '" + tableName + "'"));
        }
      }
    });
  };
  
  /**
   * Finds many database records that matches either id or where clause
   * The search param could have the following properties:
   *      {String}       where The where clause of the sql (enhanced with ? for security)
   *      {String}       order The order clause of the sql
   *      {String|Array} limit The limit clause of the sql
   * @param {Integer|Object} [search]     id or search parameters
   * @param {Array}          [userParams] Array of replacements for ? in query
   * @param {function}       [cb]         Callback to call after query has finished
   */
  this.findAll = function(search, userParams, cb) {
    _findAll.call(this, false, search, userParams, cb);
  };
  
  /**
   * Finds many database records that matches either id or where clause
   * The search param could have the following properties:
   *      {String}       where The where clause of the sql (enhanced with ? for security)
   *      {String}       order The order clause of the sql
   *      {String|Array} limit The limit clause of the sql
   *      {String}       key   Which column should be used as key for the hash? (Defaults to id column)
   * @param {Integer|Object} [search]     id or search parameters
   * @param {Array}          [userParams] Array of replacements for ? in query
   * @param {function}       [cb]         Callback to call after query has finished
   */
  this.findAllAsHash = function(search, userParams, cb) {
    _findAll.call(this, true, search, userParams, cb);
  };  



  /**
   * Creates a new instance of this model
   * @param {Object}  [data]   Object with all data of that instance
   * @param {Boolean} [loaded] Boolean that says, if it was loaded from db or not (not to set by user)
   */
  this.create = function(data, loaded) {
    var instance = { 'class': name + 'Model' },
        isNew    = !loaded,
        isDirty  = !loaded,
        deleted  = false,
        _errors   = [];
    data = data || {};

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
    instance.__defineGetter__('isDeleted', function() { return deleted; });

    instance.__defineGetter__('errors', function() { return _errors; });
    
    /**
     * Returns all defined data
     */
    instance.getData = function() {
      return data;
    };
  
    /**
     * Removes the item from db 
     */
    instance.remove = function(cb) {
      if (this.isNew) {
        cb(new errors.NotSavedYetError('Unsaved item can not be removed from DB;'));
      } else {
        query(jaz.String.interpolate(QUERY_DELETE, { tableName: tableName }), [ this.id ], function(err) {
          if (err) {
            cb(err);
          } else {
            deleted = true;
            data.id = null;
            cb(null);
          }
        });
      }
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
    
    instance.validate = function() {
      var ok      = true,
          options;
      _errors = [];
      
      var setError = function(column, type) {
        ok = false;
        _errors.push({ column: column, type: type });
        if (!_errors[column]) {
          _errors[column] = [];
        }
        _errors[column].push(type);
      };
      
      for (var column in structure) {
        options = structure[column].options;

        if (options && options.required) {
          if (!data[column]) {
            setError(column, 'required');
          }
        } else if (structure[column].validation && data[column] !== undef) {
          if (!structure[column].validation(data[column])) {
            setError(column, 'default');
          }
        }
        if (data[column] && options && options.validation) {
          if (typeof options.validation === 'function') {
            if (!options.validation(data[column])) {
              setError(column, 'custom');
            }
          } else {
            for (var validationName in options.validation) {
              if (!options.validation[validationName](data[column])) {
                setError(column, validationName);
              }
            }
          }
        }
      }
      return ok;
    };

    return instance;
  };
};

module.exports = Model;
var mysql            = require('mysql'),
    jaz              = require('jaz-toolkit'),

    errors           = require(__dirname + '/errors'),
    types            = require(__dirname + '/data_types'),
    
    undef,
    
    QUERY_INSERT     = 'INSERT INTO `#{tableName}` (#{columns}) VALUES (#{values});'
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
  
  this.create = function(data) {
    var instance = {},
        isNew    = true,
        isDirty  = true;

    // set getter and setter for data
    jaz.Object.each(structure, function(def, key) {
      instance.__defineGetter__(key, function() { return data[key]; });
      instance.__defineSetter__(key, function(value) { data[key] = value; });
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
          params  = [];
      for (var i=0,l=fields.length; i<l; ++i) {
        columns.push(jaz.String.underscore(fields[i]));
        values.push('?');
        params.push(data[fields[i]] || null);
      }
      var sql = jaz.String.interpolate(QUERY_INSERT, {
        tableName: tableName,
        columns: columns.join(','),
        values: values.join(',')
      });
      query(sql, params, function(err, result) {
        if (!err) {
          isNew = false;
          isDirty = false;
          instance.id = result.insertId;
        }
        cb(err || null, instance);
      })
    };

    return instance;
  };
};

module.exports = Model;
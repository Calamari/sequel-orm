var mysql            = require('mysql'),
    jaz              = require('jaz-toolkit'),

    errors           = require(__dirname + '/errors'),
    types            = require(__dirname + '/data_types'),
    
    undef;

var Model = function(name, definition) {
  var tableName = jaz.String.underscore(name),
      fields;
  if (!tableName.match(/s$/)) {
    tableName += 's';
  }

  if (!definition.id) {
    definition.id = types.INT();
  }
  fields = Object.keys(definition);

  this.__defineGetter__('name', function() { return name; });
  this.__defineGetter__('tableName', function() { return tableName; });
  this.__defineGetter__('fields', function() {
    return fields;
  });
};

module.exports = Model;
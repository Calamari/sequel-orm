var mysql            = require('mysql'),
    jaz              = require('jaz-toolkit'),
    EventEmitter     = require('events').EventEmitter,
    async            = require('async'),

    errors           = require(__dirname + '/errors'),
    types            = require(__dirname + '/data_types'),
    helpers          = require(__dirname + '/helpers'),

    undef,

    QUERY_FIND_WHERE   = 'SELECT #{select} FROM `#{tableName}` #{tableAlias} #{assocJoin} #{where} #{groupBy} #{order} #{limit};',
    QUERY_JOIN_ASSOCS  = 'LEFT JOIN #{assocTableName} #{aliasTableName} ON #{tableName}.id=#{aliasTableName}.#{idCol}',
    QUERY_INSERT       = 'INSERT INTO `#{tableName}` (#{columns}) VALUES (#{values});',
    QUERY_DELETE       = 'DELETE FROM `#{tableName}` #{where};',
    QUERY_UPDATE       = 'UPDATE `#{tableName}` SET #{values} #{where};',
    QUERY_MANY_TO_MANY = 'INSERT IGNORE INTO `#{tableName}` (#{columns}) VALUES #{values};'
;

"use strict";

var Model = function(name, structure, modelDefinition, query) {
  var modelNames          = {
        tableName:       helpers.pluralize(jaz.String.underscore(name)),
        name:            name,
        assocTableIdCol: jaz.String.underscore(name) + '_id',
        assocIdCol:      jaz.String.camelize(name) + 'Id'
      },
      fields,
      hookCallbacks       = {},
      associations        = { hasOne: {}, belongsTo: {}, hasMany: {} },
      hasManyAssociations = {},
      thisModel           = this;

  modelDefinition = modelDefinition || {};

  if (!structure.id) {
    structure.id = types.INT();
  }
  fields = Object.keys(structure);

  this.__defineGetter__('name', function() { return modelNames.name; });
  this.__defineGetter__('tableName', function() { return modelNames.tableName; });
  this.__defineGetter__('fields', function() { return fields; });

  // set class methods
  if (modelDefinition.classMethods) {
    for (var methodName in modelDefinition.classMethods) {
      this[methodName] = modelDefinition.classMethods[methodName];
    }
  }

  // check validators for validity
  function checkValidation(validation) {
    var validatorName;
    if (validation) {
      if (typeof validation === 'object') {
        for (validatorName in validation) {
          if (typeof validation[validatorName] !== 'function') {
            throw new errors.NotAValidatorError("Not a validator method as validation '" + validatorName + "' given in " + name + "." + columnName);
          }
        }
      } else if (typeof validation !== 'function') {
        throw new errors.NotAValidatorError("Not a validator method as validation given in " + name + "." + columnName);
      }
    }
  }
  for (var columnName in structure) {
    checkValidation(structure[columnName].options.validation);
    checkValidation(modelDefinition.validations && modelDefinition.validations[columnName] && modelDefinition.validations[columnName].validation);
  }

  var setHook = function(hook, callback) {
    if (!hookCallbacks[hook]) {
      hookCallbacks[hook] = [];
    }

    hookCallbacks[hook].push(callback);
  };

  var fireHook = function(hook, instance, args) {
    var callbacks = hookCallbacks[hook];
    if (callbacks) {
      for (var i=0,l=callbacks.length; i<l; ++i) {
        callbacks[i].apply(instance, args);
      }
    }
  };

  if (modelDefinition.hooks) {
    for (var hook in modelDefinition.hooks) {
      setHook(hook, modelDefinition.hooks[hook]);
    }
  }

  function addAssociation(type, model, options) {
    options = options || {};
    var self      = this,
        SequelORM = require(__dirname + '/');

    if (typeof model !== 'string') {
      associations[type][options.name || model.name] = { model: model, options: options };
    } else {
      var definedModel = SequelORM.getModel(model);
      if (definedModel) {
        associations[type][options.name || model] = { model: definedModel, options: options };
      } else {
        SequelORM.once('model_defined', function(definedModel) {
          if (definedModel.name === model) {
            associations[type][options.name || model] = { model: definedModel, options: options };
          }
        });
      }
    }
  }

  /**
   * Adds a belongsTo association to given model
   * @param {String|Model} model          String of model name or model instance
   * @param {Object}       [options]      Options object
   * @param {String}       [options.name] Name under which association is callable
   */
  this.belongsTo = function(model, options) {
    addAssociation('belongsTo', model, options);
  };

  /**
   * Adds a hasOne association to given model
   * @param {String|Model} model          String of model name or model instance
   * @param {Object}       [options]      Options object
   * @param {String}       [options.name] Name under which association is callable
   */
  this.hasOne = function(model, options) {
    addAssociation('hasOne', model, options);
  };

  /**
   * Adds a hasMany association to given model
   * @param {String|Model} model          String of model name or model instance
   * @param {Object}       [options]      Options object
   * @param {String}       [options.name] Name under which association is callable
   */
  this.hasMany = function(model, options) {
    addAssociation('hasMany', model, options);
  };

  /**
   * Adds a many to many association from this model to another model
   * @param {String|Model} model String of model name or model instance
   */
  this.hasAndBelongsToMany = function(model) {
    //TODO: add options and name option here, too
    var self      = this,
        SequelORM = require(__dirname + '/'),
        addAssoc  = function(definedModel) {
          var attributeName  = jaz.String.camelize(definedModel.name),
              attrNamePlural = helpers.pluralize(attributeName),
              tableName      = jaz.String.underscore(attrNamePlural);

          hasManyAssociations[definedModel.name] = {
            model: definedModel,
            names: {
              modelName:           definedModel.name,
              attributeName:       attributeName,
              attributeNamePlural: attrNamePlural,
              tableName:           tableName,
              attributeIdCol:      attributeName + 'Ids',
              assocTableName:      helpers.getJoinTableName(thisModel.name, definedModel.name),
              assocTableIdCol:     jaz.String.underscore(attributeName) + '_id'
            }
          };
        };
    if (typeof model === 'string') {
      var definedModel = SequelORM.getModel(model);
      if (definedModel) {
        addAssoc(definedModel);
      } else {
        SequelORM.once('model_defined', function(definedModel) {
          if (definedModel.name === model) {
            addAssoc(definedModel);
          }
        });
      }
    } else {
      addAssoc(model);
    }
  };

  /**
   * Intern worker method that finds all matching database records that matches where clause
   * @param {Integer|Object} search     id or search parameters
   * @param {Array}          [userParams] Array of replacements for ? in query
   * @param {function}       [cb]         Callback to call after query has finished
   */
  var _find = function(search, userParams, cb) {
    var params      = [],
        sql         = '',
        limit       = '',
        id          = null,
        assocJoins  = [],
        selects     = null,
        groupBy     = '',
        SequelORM   = require(__dirname + '/');

    if (typeof userParams === 'function') {
      cb = userParams;
      userParams = undef;
    }
    if (typeof search === 'object') {
      sql = jaz.String.interpolate(QUERY_FIND_WHERE, {
        tableName:  modelNames.tableName,
        tableAlias: modelNames.tableName,
        where: search.where ? 'WHERE ' + search.where : '',
        order: search.order ? 'ORDER BY ' + search.order : ''
      });
      params = userParams || [];
    }
    if (search.limit) {
      limit =  'LIMIT ';
      if (search.offset) {
        limit += search.offset + ',';
      }
      limit += search.limit;
    }

    var checkForAttributeValidity = function(attributes) {
      var i, attr;
      for (i = attributes.length; i--;) {
        attr = attributes[i];
        if (!structure[attr]) {
          cb && cb(new errors.NotValidColumnError("Key '" + attr + "' is not a valid Column in table '" + modelNames.tableName + "'"));
          return false;
        }
      }
      return true;
    };

    if (search.select) {
      selects = [search.select];
    } else if (search.only) {
      if (!checkForAttributeValidity(search.only)) { return; }
      selects = jaz.Array.map(search.only, function(attr) { return modelNames.tableName + '.' + jaz.String.underscore(attr); })
      selects.unshift(modelNames.tableName + '.id');
    } else if (search.except) {
      if (!checkForAttributeValidity(search.except)) { return; }
      var selects = jaz.Array.reject(Object.keys(structure), function(attr) {console.log(attr, jaz.Array.include(search.except, attr)); return jaz.Array.include(search.except, attr); });
      selects = jaz.Array.map(selects, function(attr) { return modelNames.tableName + '.' + jaz.String.underscore(attr); })
    } else {
      selects = [modelNames.tableName + '.*'];
    }

    /**
     * get ids of all hasOne associated columns
     */
    if (Object.keys(associations['hasOne']).length) {
      Object.keys(associations['hasOne']).forEach(function(assocName) {
        var model          = associations['hasOne'][assocName].model,
            modelOptions   = associations['hasOne'][assocName].options,
            asName         = modelOptions.name || assocName,
            assocAliasName = helpers.pluralize(jaz.String.underscore(asName))
            assocTableName = model.tableName,
            assocId        = modelOptions.selfName ? jaz.String.underscore(modelOptions.selfName) : jaz.String.underscore(thisModel.name);
        selects.push(assocAliasName + '.id ' + jaz.String.underscore(asName) + '_id');
        assocJoins.push(jaz.String.interpolate(QUERY_JOIN_ASSOCS, {
          assocTableName: assocTableName,
          aliasTableName: assocAliasName,
          tableName:      modelNames.tableName,
          idCol:          assocId + '_id'
        }));
      });
    }

    /**
     * get ids of all hasMany associated columns
     */
    if (Object.keys(associations['hasMany']).length) {
      Object.keys(associations['hasMany']).forEach(function(modelName) {
        var model          = associations['hasMany'][modelName].model,
            modelOptions   = associations['hasMany'][modelName].options,
            asName         = modelOptions.name || modelName,
            asNameIdCol    = jaz.String.underscore(asName) + '_id',
            assocTableName = model.tableName,
            assocAliasName = helpers.pluralize(jaz.String.underscore(asName)),
            assocId        = modelOptions.selfName ? jaz.String.underscore(modelOptions.selfName) : jaz.String.underscore(thisModel.name);
        selects.push(assocAliasName + '.id ' + asNameIdCol);
        selects.push('GROUP_CONCAT(' + assocAliasName + '.id' + ') ' + helpers.pluralize(asNameIdCol) );
        assocJoins.push(jaz.String.interpolate(QUERY_JOIN_ASSOCS, {
          assocTableName: assocTableName,
          aliasTableName: assocAliasName,
          tableName:      modelNames.tableName,
          idCol:          assocId + '_id'
        }));
      });
    }

    /**
     * get all hasMany associations
     */
    if (Object.keys(hasManyAssociations).length) {
      groupBy = 'GROUP BY ' + modelNames.tableName + '.id';
      Object.keys(hasManyAssociations).forEach(function(modelName) {
        var assoc = hasManyAssociations[modelName];
        selects.push('GROUP_CONCAT(' + assoc.names.assocTableName + '.' + assoc.names.assocTableIdCol + ') ' + jaz.String.underscore(assoc.names.attributeIdCol) );
        assocJoins.push(jaz.String.interpolate(QUERY_JOIN_ASSOCS, {
          assocTableName: assoc.names.assocTableName,
          aliasTableName: assoc.names.assocTableName,
          tableName:      modelNames.tableName,
          idCol:          jaz.String.underscore(thisModel.name) + '_id'
        }));
      });
    }
    sql = jaz.String.interpolate(sql, {
      limit:     limit,
      select:    selects.join(','),
      assocJoin: assocJoins.join(' '),
      groupBy:   groupBy
    });
    query(sql, params, function(err, results) {
      if (!err) {
        cb(null, results);
      } else {
        cb(err);
      }
    });
  };

  /**
   * Counts all records in database (given a where clause)
   * The search param as object could have the following properties:
   *      {String} where The where clause of the sql (enhanced with ? for security)
   * @param {Integer|Object} [search]     search parameters
   * @param {function}       [cb]         Callback to call after query has finished
   */
  this.count = function(search, userParams, cb) {
    if (typeof userParams === 'function') {
      cb = userParams;
      userParams = [];
    } else if (userParams === undef) {
      userParams = [];
    }
    if (typeof search === 'function') {
      // no search parameter given
      cb = search;
      search = {};
    }
    search.select = 'count(id) as count';
    _find(search, userParams, function(err, results) {
      if (err) {
        cb && cb(err, null);
      } else {
        cb && cb(null, results[0].count);
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
    var createMethod = this.create,
        id;
    if (typeof userParams === 'function') {
      cb = userParams;
      userParams = [];
    } else if (userParams === undef) {
      userParams = [];
    }
    if (typeof search === 'function') {
      // no search parameter given
      cb = search;
      search = {};
    } else if (typeof search === 'number') {
      // search parameter is an id
      id = search;
      search = { where: modelNames.tableName + '.id=?' };
      userParams.push(id);
    }
    if (!search) {
      return cb && cb(new errors.ItemNotFoundError('Unspecified record `' + name + '` not found!'));
    }
    search.limit = 1;
    _find(search, userParams, function(err, results) {
      if (err) {
        cb && cb(err, null);
      } else {
        var record     = null,
            recordData = {};

        if (results.length) {
          for (var key in results[0]) {
            recordData[jaz.String.camelize(key)] = results[0][key];
          }
          record = createMethod(recordData, true);
          cb && cb(null, record);
        } else {
          var recordId = '';
          if (id) {
            recordId = modelNames.tableName + '.id=' + id;
          } else {
            recordId = 'where clause (' + search.where + ')';
          }
          err = new errors.ItemNotFoundError('Record `' + name + '` with id=' + id + ' not found!');
          cb && cb(err);
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
          cb && cb(null, records);
        } else {
          cb && cb(new errors.NotValidColumnError("Key '" + search.key + "' is not a valid Column in table '" + modelNames.tableName + "'"));
        }
      }
    });
  };

  /**
   * Finds many database records that matches either id or where clause
   * The search param could have the following properties:
   *      {String}       where     The where clause of the sql (enhanced with ? for security)
   *      {String}       order     The order clause of the sql
   *      {String|Array} limit     The limit clause of the sql
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
    var instance                 = { 'class': name + 'Model' },
        SequelORM                = require(__dirname + '/'),
        isNew                    = !loaded,
        isDirty                  = !loaded,
        deleted                  = false,
        _errors                  = [],
        loadedAssociations       = {},
        loadedManyAssociations   = {},
        manyAssociationsToRemove = {},
        removedAssocationWhere   = {},
        hasManyTableIdCol        = jaz.String.underscore(name) + '_id',
        dirtyAttributes          = [];
    data = data || {};

    // Use all load methods of DataTypes here
    if (loaded) {
      Object.keys(data).forEach(function(key) {
        if (structure[key]) {
          data[key] = structure[key].load(data[key]);
        }
      });
    }

    /**
     * All defined information about the record
     */
    instance.__defineGetter__('data', function() { return data; });

    // enhance object with EventEmitter methods
    jaz.Object.extend(instance, new EventEmitter());

    // set getter and setter for data
    jaz.Object.each(structure, function(def, key) {
      instance.__defineGetter__(key, function() { return data[key]; });
      instance.__defineSetter__(key, function(value) {
        fireHook('beforeChange', instance, [key, value]);
        data[key] = value;
        isDirty = true;
        if (key != 'id') { dirtyAttributes.push(key); }
        fireHook('afterChange', instance, [key, value]);
      });
    });
    instance.__defineGetter__('id', function() { return data.id || 0; });

    // add getter methods to instance
    Object.keys(modelDefinition.getter || {}).forEach(function(key) {
      instance.__defineGetter__(key, modelDefinition.getter[key]);
    });

    // add setter methods to instance
    Object.keys(modelDefinition.setter || {}).forEach(function(key) {
      instance.__defineSetter__(key, function(val) { data[key] = modelDefinition.setter[key].call(instance, val); });
    });

    // set setter and getter for to one associations
    function prepareOneAssociations(type) {
      Object.keys(associations[type]).forEach(function(modelName) {
        var model        = associations[type][modelName].model,
            modelOptions = associations[type][modelName].options,
            assocName    = modelOptions.name || modelName,
            name         = jaz.String.camelize(modelName),

            getterName   = 'get' + assocName,
            setterName   = 'set' + assocName,
            removeName   = 'remove' + assocName,
            idCol        = jaz.String.camelize(assocName) + 'Id',
            tableIdCol   = jaz.String.underscore(idCol);
        // setter
        //TODO: check for value = null -> remove

        instance[setterName] = function(value) {
          loadedAssociations[modelName] = value;
          data[idCol] = value.id;
          if (!value.id) {
            value.once('save', function() {
              data[idCol] = value.id;
            });
          }
          if (type === 'hasOne') {
            if (!instance.id) {
              instance.once('save', function() {
                var assocIdCol = modelOptions.selfName ? jaz.String.camelize(modelOptions.selfName) + 'Id' : modelNames.assocIdCol;
                value[assocIdCol] = instance.id;
              });
            }
          }
          isDirty = true;
          dirtyAttributes.push(idCol);
        };
        instance.__defineSetter__(name, instance[setterName]);

        // getter
        instance[getterName] = function(cb) {
          var SequelORM = require(__dirname + '/');
          if (loadedAssociations[modelName]) {
            cb(null, loadedAssociations[modelName]);
            return;
          }
          SequelORM.getModel(model.name).find(data[idCol], function(err, item) {
            if (!err) {
              loadedAssociations[modelName] = item;
            }
            cb(err, item);
          });
        };
        instance.__defineGetter__(name, function() { return loadedAssociations[modelName]; });
        // .thingId
        instance.__defineGetter__(idCol, function() { return data[idCol] || 0; });

        // .removeThing
        instance[removeName] = function() {
          if (data[idCol] || loadedAssociations[modelName]) {
            if (type === 'hasOne' && data[idCol]) {
              removedAssocationWhere[model.name] = {
                assocTableIdCol: modelOptions.selfName ? jaz.String.underscore(modelOptions.selfName) + '_id' : modelNames.assocTableIdCol,
                id:              data[idCol]
              };
            }
            data[idCol] = 0;
            loadedAssociations[modelName] = null;
            delete loadedAssociations[modelName];
            isDirty = true;
            dirtyAttributes.push(idCol);
          }
        };
      });
    };
    prepareOneAssociations('belongsTo');
    prepareOneAssociations('hasOne');

    Object.keys(associations['hasMany']).forEach(function(modelName) {
      var model               = associations['hasMany'][modelName].model,
          modelOptions        = associations['hasMany'][modelName].options,
          name                = jaz.String.camelize(modelName),
          assocName           = modelOptions.name || modelName,

          attributeName       = jaz.String.camelize(assocName),
          idCol               = attributeName + 'Ids',
          attributeNamePlural = helpers.pluralize(attributeName),
          tableIdCol          = jaz.String.underscore(idCol),
          pluralizedAssocName = helpers.pluralize(assocName),

          getOneName          = 'get' + assocName,
          setOneName          = 'add' + assocName,
          getterName          = 'get' + pluralizedAssocName,
          setterName          = 'add' + pluralizedAssocName,
          removeOneName       = 'remove' + assocName,
          removeAllName       = 'removeAll' + pluralizedAssocName,
          countName           = 'countAll' + pluralizedAssocName,
          countRemoveName     = 'count' + assocName + 'sToRemove';

      // if freshly loaded, split the ids to array
      data[idCol] = data[idCol] ? jaz.Array.map(data[idCol].split(','), function(id) { return ~~id; }) : [];

      loadedManyAssociations[assocName] = {
        content:      [],
        asHash:       {},
        modelName:    model.name,
        tableName:    model.tableName,
        idCol:        name + '_id',
        selfIdCol:    modelOptions.selfName ? jaz.String.camelize(modelOptions.selfName) + '_id' : modelNames.assocTableIdCol,
        type:         'oneToMany',
        unsavedItems: [],
        removedItems: []
      };

      // Helpmethods
      function isIdAssociated(id) {
        return jaz.Array.include(data[idCol], id);
      }
      function isItemAssociated(item) {
        return jaz.Array.include(loadedManyAssociations[assocName].content, item);
      }

      // Setter: .addThing() / .addThings()
      instance[setterName] = instance[setOneName] = function(values) {
        if (arguments.length) {
          var items                = jaz.Object.isArray(arguments[0]) ? arguments[0] : arguments,
              atLeastOneItemIsNew  = false;
          if (items.length) {
            jaz.Array.each(items, function(item) {
              var itemIsId         = jaz.Object.isNumber(item),
                  idAlreadyAdded   = jaz.Array.include(data[idCol], itemIsId ? item : item.id),
                  itemAlreadyAdded = (!itemIsId && jaz.Array.include(loadedManyAssociations[assocName].unsavedItems, item)),
                  alreadyAdded     = idAlreadyAdded || itemAlreadyAdded;

              if (!alreadyAdded && item) {
                atLeastOneItemIsNew = true;
                if (!itemIsId) {
                  // stores all associated items we have loaded from db or got set
                  loadedManyAssociations[assocName].content.push(item);
                  if (item.id) {
                    loadedManyAssociations[assocName].asHash[item.id] = item;
                  }
                }

                // stores the items, we added since last sync
                loadedManyAssociations[assocName].unsavedItems.push(item);

                if (item.id) {
                  // store in .thingIds the ids we have to store in db
                  data[idCol].push(item.id);
                } else if (itemIsId) {
                  data[idCol].push(item);
                } else {
                  item.once('save', function(savedItem) {
                    data[idCol].push(savedItem.id);
                    loadedManyAssociations[assocName].asHash[savedItem.id] = savedItem;
                  });
                }
              } else {
                // if first id then item or vice versa
                if (!itemIsId && !jaz.Array.include(loadedManyAssociations[assocName].content, item)) {
                  // stores all associated items we have loaded from db or got set
                  loadedManyAssociations[assocName].content.push(item);
                  if (item.id) {
                    loadedManyAssociations[assocName].asHash[item.id] = item;
                  }
                }
              }
            });
            if (atLeastOneItemIsNew) {
              isDirty = true;
              dirtyAttributes.push(assocName);
            }
          }
        }
      };

      // Getter: .getThings()
      // TOTAL copy
      instance[getterName] = function(cb) {
        var idsToLoad = jaz.Array.reject(data[idCol], function(id) { return loadedManyAssociations[assocName].asHash[id]; });
        if (idsToLoad.length) {
          SequelORM.getModel(model.name).findAll({ where: helpers.modelNameToTableName(model.name) + '.id IN (' + idsToLoad.join(',') + ')' }, function(err, items) {
            if (err) {
              cb(err, loadedManyAssociations[assocName].content);
            } else {
              items.forEach(function(item) {
                loadedManyAssociations[assocName].content.push(item);
                loadedManyAssociations[assocName].asHash[item.id] = item;
              });
              cb(null, loadedManyAssociations[assocName].content);
            }
          });
        } else {
          cb(null, loadedManyAssociations[assocName].content);
        }
      };

      // Getter: .getThing()
      // TOTAL copy
      instance[getOneName] = function(id, cb) {
        var item = loadedManyAssociations[assocName].asHash[id];
        if (item) {
          cb(null, item);
        } else if (!jaz.Array.include(data[idCol], id)) {
          //TODO: adapt error message like "modelName (assocName)"
          cb(new errors.NotAssociatedItemError("Record does not have an associated " + modelName + " with id=" + id));
        } else {
          SequelORM.getModel(model.name).find(id, function(err, item) {
            if (!err) {
              loadedManyAssociations[assocName].content.push(item);
              loadedManyAssociations[assocName].asHash[item.id] = item;
            }
            cb(err, item);
          });
        }
      };

      // Deleter: .removeThing()
      // TOTAL copy
      instance[removeOneName] = function(value) {
        var removeId = jaz.Object.isNumber(value) ? value : value.id;

        if (removeId) {
          if (isIdAssociated(removeId)) {
            loadedManyAssociations[assocName].content = jaz.Array.reject(loadedManyAssociations[assocName].content, function(item) {
              return item.id == removeId;
            });
            loadedManyAssociations[assocName].unsavedItems = jaz.Array.reject(loadedManyAssociations[assocName].unsavedItems, function(item) {
              return item.id == removeId;
            });
            delete loadedManyAssociations[assocName].asHash[removeId];
            data[idCol] = jaz.Array.without(data[idCol], removeId);
            removeId && loadedManyAssociations[assocName].removedItems.push(removeId);
            isDirty = true;
          }
        } else {
          if (isItemAssociated(value)) {
            loadedManyAssociations[assocName].content = jaz.Array.without(loadedManyAssociations[assocName].content, value);
            loadedManyAssociations[assocName].unsavedItems = jaz.Array.without(loadedManyAssociations[assocName].unsavedItems, value);
            isDirty = true;
          }
        }
      };

      // Deleter: .removeAllThings()
      // TOTAL copy
      instance[removeAllName] = function() {
        loadedManyAssociations[assocName].content = [];
        loadedManyAssociations[assocName].removedItems.push.apply(loadedManyAssociations[assocName].removedItems, data[idCol]);
        loadedManyAssociations[assocName].unsavedItems = [];
        data[idCol] = [];
      };

      // .thingIds
      // TOTAL copy
      instance.__defineGetter__(idCol, function() { return data[idCol] || []; });

      // Getter: .things
      // TOTAL copy
      instance.__defineGetter__(attributeNamePlural, function() { return loadedManyAssociations[assocName].content; });

      // Count: .countAllThings()
      // TOTAL copy
      instance[countName] = function() {
        return data[idCol].length + jaz.Array.reject(loadedManyAssociations[assocName].unsavedItems, function(item) { return item.id; }).length;
      };
      // Count: .countThingsToRemove()
      // TOTAL copy
      instance[countRemoveName] = function() { return loadedManyAssociations[assocName].removedItems.length; };

    });


    Object.keys(hasManyAssociations).forEach(function(modelName) {
      var model               = hasManyAssociations[modelName].model,

          names               = hasManyAssociations[modelName].names,
          name                = names.attributeName,
          idCol               = names.attributeIdCol,
          pluralizedModelName = helpers.pluralize(modelName),

          getOneName          = 'get' + modelName,
          setOneName          = 'add' + modelName,
          getterName          = 'get' + pluralizedModelName,
          setterName          = 'add' + pluralizedModelName,
          removeOneName       = 'remove' + modelName,
          removeAllName       = 'removeAll' + pluralizedModelName,
          countName           = 'countAll' + pluralizedModelName,
          countSavedName      = 'countSaved' + pluralizedModelName,
          countLoadedName     = 'countLoaded' + pluralizedModelName,
          countUnsavedName    = 'countUnsaved' + pluralizedModelName,
          countRemoveName     = 'count' + modelName + 'sToRemove';

      // if freshly loaded, split the ids to array
      data[idCol] = data[idCol] ? jaz.Array.map(data[idCol].split(','), function(id) { return ~~id; }) : [];

      loadedManyAssociations[modelName] = {
        content:      [],
        asHash:       {},
        modelName:    modelName,
        tableName:    names.assocTableName,
        idCol:        name + '_id',
        type:         'manyToMany',
        unsavedItems: [],
        removedItems: []
      };
      manyAssociationsToRemove[modelName] = [];

      // Helpmethods
      function isIdAssociated(id) {
        return jaz.Array.include(data[idCol], id);
      }
      function isItemAssociated(item) {
        return jaz.Array.include(loadedManyAssociations[modelName].content, item);
      }

      // Setter: .addThing() / .addThings()
      instance[setterName] = instance[setOneName] = function(values) {
        if (arguments.length) {
          var items                = jaz.Object.isArray(arguments[0]) ? arguments[0] : arguments,
              atLeastOneItemIsNew  = false;
          if (items.length) {
            jaz.Array.each(items, function(item) {
              var itemIsId         = jaz.Object.isNumber(item),
                  idAlreadyAdded   = jaz.Array.include(data[idCol], itemIsId ? item : item.id),
                  itemAlreadyAdded = (!itemIsId && jaz.Array.include(loadedManyAssociations[modelName].unsavedItems, item)),
                  alreadyAdded     = idAlreadyAdded || itemAlreadyAdded;

              if (!alreadyAdded && item) {
                atLeastOneItemIsNew = true;
                if (!itemIsId) {
                  // stores all associated items we have loaded from db or got set
                  loadedManyAssociations[modelName].content.push(item);
                  if (item.id) {
                    loadedManyAssociations[modelName].asHash[item.id] = item;
                  }
                }

                // stores the items, we added since last sync
                loadedManyAssociations[modelName].unsavedItems.push(item);

                if (item.id) {
                  // store in .thingIds the ids we have to store in db
                  data[idCol].push(item.id);
                } else if (itemIsId) {
                  data[idCol].push(item);
                } else {
                  item.once('save', function(savedItem) {
                    data[idCol].push(savedItem.id);
                    loadedManyAssociations[modelName].asHash[savedItem.id] = savedItem;
                  });
                }
              } else {
                // if first id then item or vice versa
                if (!itemIsId && !jaz.Array.include(loadedManyAssociations[modelName].content, item)) {
                  // stores all associated items we have loaded from db or got set
                  loadedManyAssociations[modelName].content.push(item);
                  if (item.id) {
                    loadedManyAssociations[modelName].asHash[item.id] = item;
                  }
                }
              }
            });
            if (atLeastOneItemIsNew) {
              isDirty = true;
              dirtyAttributes.push(modelName)
            }
          }
        }
      };

      // Getter: .getThings()
      instance[getterName] = function(cb) {
        var idsToLoad = jaz.Array.reject(data[idCol], function(id) { return loadedManyAssociations[modelName].asHash[id]; });
        if (idsToLoad.length) {
          SequelORM.getModel(model.name).findAll({ where: helpers.modelNameToTableName(modelName) + '.id IN (' + idsToLoad.join(',') + ')' }, function(err, items) {
            if (err) {
              cb(err, loadedManyAssociations[modelName].content);
            } else {
              items.forEach(function(item) {
                loadedManyAssociations[modelName].content.push(item);
                loadedManyAssociations[modelName].asHash[item.id] = item;
              });
              cb(null, loadedManyAssociations[modelName].content);
            }
          });
        } else {
          cb(null, loadedManyAssociations[modelName].content);
        }
      };

      // Getter: .getThing()
      instance[getOneName] = function(id, cb) {
        var item = loadedManyAssociations[modelName].asHash[id];
        if (item) {
          cb(null, item);
        } else if (!jaz.Array.include(data[idCol], id)) {
          cb(new errors.NotAssociatedItemError("Record does not have an associated " + modelName + " with id=" + id));
        } else {
          SequelORM.getModel(model.name).find(id, function(err, item) {
            if (!err) {
              loadedManyAssociations[modelName].content.push(item);
              loadedManyAssociations[modelName].asHash[item.id] = item;
            }
            cb(err, item);
          });
        }
      };

      // Deleter: .removeThing()
      instance[removeOneName] = function(value) {
        var removeId = jaz.Object.isNumber(value) ? value : value.id;

        if (removeId) {
          if (isIdAssociated(removeId)) {
            loadedManyAssociations[modelName].content = jaz.Array.reject(loadedManyAssociations[modelName].content, function(item) {
              return item.id == removeId;
            });
            loadedManyAssociations[modelName].unsavedItems = jaz.Array.reject(loadedManyAssociations[modelName].unsavedItems, function(item) {
              return item.id == removeId;
            });
            delete loadedManyAssociations[modelName].asHash[removeId];
            data[idCol] = jaz.Array.without(data[idCol], removeId);
            removeId && loadedManyAssociations[modelName].removedItems.push(removeId);
            isDirty = true;
          }
        } else {
          if (isItemAssociated(value)) {
            loadedManyAssociations[modelName].content = jaz.Array.without(loadedManyAssociations[modelName].content, value);
            loadedManyAssociations[modelName].unsavedItems = jaz.Array.without(loadedManyAssociations[modelName].unsavedItems, value);
            isDirty = true;
          }
        }
      };

      // Deleter: .removeAllThings()
      instance[removeAllName] = function() {
        loadedManyAssociations[modelName].content = [];
        loadedManyAssociations[modelName].removedItems.push.apply(loadedManyAssociations[modelName].removedItems, data[idCol]);
        loadedManyAssociations[modelName].unsavedItems = [];
        data[idCol] = [];
      };

      // Getter: .thingIds
      // Contains all ids that are stored in db
      instance.__defineGetter__(idCol, function() { return data[idCol]; });
      // Getter: .things
      instance.__defineGetter__(names.attributeNamePlural, function() { return loadedManyAssociations[modelName].content; });
      // Count: .countAllThings()
      instance[countName] = function() {
        return data[idCol].length + jaz.Array.reject(loadedManyAssociations[modelName].unsavedItems, function(item) { return item.id; }).length;
      };
      // Count: .countThingsToRemove()
      instance[countRemoveName] = function() { return loadedManyAssociations[modelName].removedItems.length; };
    });

    /**
     * Returns the count of all associations we added since we created, loaded from or synced with the db
     * @param {String} assocModelName name of the model
     * @return {Number}
     */
    instance.countAddedAssociations = function(assocModelName) {
      if (loadedManyAssociations[assocModelName]) {
        return loadedManyAssociations[assocModelName].unsavedItems.length;
      } else {
        throw new errors.AssociationNotDefinedError;
      }
    };

    instance.setAttribute = function(key, value) {
      data[key] = value;
      isDirty = true;
    };

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

    if (loaded) {
      fireHook('afterLoad', instance, [data]);
    } else {
      fireHook('afterCreate', instance, [data]);
    }

    /**
     * Returns all defined data
     */
    instance.getData = function() {
      return data;
    };

    /**
     * Removes the item from db
     */
    instance.destroy = function(cb) {
      if (this.isNew) {
        cb(new errors.NotSavedYetError('Unsaved item can not be removed from DB;'));
      } else {
        query(jaz.String.interpolate(QUERY_DELETE, { tableName: modelNames.tableName, where: 'WHERE id=?' }), [ this.id ], function(err) {
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
      // TODO: make this some kind of middleware? (maybe added by addTimestamps method?)
      if (structure.createdAt && isNew) {
        instance.createdAt = new Date();
      }
      if (structure.updatedAt) {
        instance.updatedAt = new Date();
      }

      var columns = [],
          values  = [],
          params  = [],
          sql, i, l,
          allAssociationsSaved = true;

      // check for unsaved associations
      Object.keys(loadedAssociations).forEach(function(modelName) {
        var isBelongsTo = !!associations.belongsTo[modelName];
        if (isBelongsTo && !loadedAssociations[modelName].id) {
          allAssociationsSaved = false;
          cb(new errors.AssociationsNotSavedError("Associated '" + modelName + "' was not saved."));
        }
      });
      Object.keys(loadedManyAssociations).forEach(function(assocModelName) {
        if (jaz.Array.any(loadedManyAssociations[assocModelName].content, function(item) { return !item.id; })) {
          allAssociationsSaved = false;
          cb(new errors.AssociationsNotSavedError("Associated '" + assocModelName + "' was not saved."));
        }
      });
      if (!allAssociationsSaved) {
        return;
      }

      if (isNew) {
        for (i=0,l=fields.length; i<l; ++i) {
          if (fields[i] !== 'id') {
            columns.push('`' + jaz.String.underscore(fields[i]) + '`');
            values.push('?');
            params.push(structure[fields[i]].save(data[fields[i]]) || (structure[fields[i]].options.allowNull ? null : ''));
            // TODO: default value here?
          }
        }

        sql = jaz.String.interpolate(QUERY_INSERT, {
          tableName: modelNames.tableName,
          columns: columns.join(','),
          values: values.join(',')
        });
      } else {
        for (i=0,l=dirtyAttributes.length; i<l; ++i) {
          if (dirtyAttributes[i] !== 'id' && structure[dirtyAttributes[i]]) {
            values.push(jaz.String.underscore(dirtyAttributes[i]) + ' = ?');
            params.push(structure[dirtyAttributes[i]].save(data[dirtyAttributes[i]]) || null);
          }
        }

        sql = params.length ? jaz.String.interpolate(QUERY_UPDATE, {
          tableName: modelNames.tableName,
          values: values.join(','),
          where: 'WHERE id=' + instance.id
        }) : '';
      }
      if (instance.validate()) {
        fireHook('beforeSave', instance, []);

        var saveCallback = function(err, result) {
          var assocQueries = [],
              SequelORM    = require(__dirname + '/'),
              assocDefinition;

          if (!err) {
            if (isNew && result) {
              instance.id = result.insertId;
            }

            // hasOne associations
            if (Object.keys(removedAssocationWhere).length) {
              Object.keys(removedAssocationWhere).forEach(function(modelName) {
                var sql = jaz.String.interpolate(QUERY_UPDATE, {
                  tableName: SequelORM.getModel(modelName).tableName,
                  values: removedAssocationWhere[modelName].assocTableIdCol + '=0',
                  where: 'WHERE id=' + removedAssocationWhere[modelName].id
                  //where: 'WHERE ' + modelNames.assocTableIdCol + '=' + instance.id
                });

                assocQueries.push(function(callback) {
                  query(sql, function(err) {
                    if (!err) {
                      delete removedAssocationWhere[modelName];
                    }
                    callback.apply(this, arguments);
                  });
                });
              });
            }

            // OneToMany & ManyToMany associations
            if (Object.keys(loadedManyAssociations).length) {
              Object.keys(loadedManyAssociations).forEach(function(name) {
                var values     = [],
                    ids        = [],
                    whereIds   = [],
                    instanceId = ~~instance.id,
                    type       = loadedManyAssociations[name].type,
                    isMany     = (type === 'manyToMany'),
                    insertSql, removedSql, itemId, removedIds, whereRemovedIds;

                loadedManyAssociations[name].unsavedItems.forEach(function(item) {
                  itemId = ~~(jaz.Object.isNumber(item) ? item : item.id);
                  values.push('(' + instanceId + ',' + itemId + ')');
                  ids.push(itemId);
                  if (!isMany) {
                    whereIds.push(loadedManyAssociations[name].tableName + '.id=' + itemId);
                  }
                });

                // save hasMany associations
                if (ids.length) {
                  if (isMany) {
                    insertSql = jaz.String.interpolate(QUERY_MANY_TO_MANY, {
                      tableName: loadedManyAssociations[name].tableName,
                      columns: hasManyTableIdCol + ',' + jaz.String.underscore(loadedManyAssociations[name].idCol),
                      values: values.join(',')
                    });
                  } else {
                    insertSql = jaz.String.interpolate(QUERY_UPDATE, {
                      tableName: loadedManyAssociations[name].tableName,
                      where: 'WHERE ' + whereIds.join(' OR '),
                      values: loadedManyAssociations[name].selfIdCol + '=' + instanceId
                    });
                  }

                  assocQueries.push(function(callback) {
                    // send the hasMany query for this loadedManyAssociation
                    query(insertSql, function(err) {
                      if (!err) {
                        loadedManyAssociations[name].unsaved = jaz.Array.without(loadedManyAssociations[name].unsaved, ids);
                        loadedManyAssociations[name].unsavedItems = jaz.Array.reject(loadedManyAssociations[name].unsavedItems, function(item) {
                          return jaz.Array.include(ids, ~~(jaz.Object.isNumber(item) ? item : item.id));
                        });
                      }
                      callback.apply(this, arguments);
                    });
                  });
                }

                // remove ManyToMany associations
                if (loadedManyAssociations[name].removedItems.length) {
                  assocDefinition = hasManyAssociations[loadedManyAssociations[name].modelName];
                  removedIds      = loadedManyAssociations[name].removedItems;
                  whereRemovedIds = jaz.Array.map(loadedManyAssociations[name].removedItems, function(itemId) {
                    return loadedManyAssociations[name].tableName + '.id=' + itemId;
                  });
                  if (isMany) {
                    removedSql = jaz.String.interpolate(QUERY_DELETE, {
                      tableName: assocDefinition.names.assocTableName,
                      where: 'WHERE ' + hasManyTableIdCol + '=' + ~~instance.id + ' AND ' + assocDefinition.names.assocTableIdCol + ' IN (' + removedIds.join(',') + ')'
                    });
                  } else {
                    removedSql = jaz.String.interpolate(QUERY_UPDATE, {
                      tableName: loadedManyAssociations[name].tableName,
                      where: 'WHERE ' + whereRemovedIds.join(' OR '),
                      values: loadedManyAssociations[name].selfIdCol + '=0'
                    });
                  }
                  assocQueries.push(function(callback) {
                    // send the hasMany query for this loadedManyAssociation
                    query(removedSql, function(err) {
                      if (!err) {
                        loadedManyAssociations[name].removedItems = jaz.Array.reject(loadedManyAssociations[name].removedItems, function(removedId) {
                          return jaz.Array.include(removedIds, removedId);
                        });
                      }
                      callback.apply(this, arguments);
                    });
                  });
                }
              });
            }

            isNew = false;
            isDirty = false;

            var finalize = function(err) {
              instance.emit('save', instance);
              fireHook('afterSave', instance, []);
              // TODO: test if the save callbacks will called if something goes wrong or get the error
              cb && cb(err || null, instance);
            }
            if (assocQueries.length) {
              async.parallel(assocQueries, finalize);
            } else {
              finalize();
            }
          } else {
            cb && cb(err);
          }
        };

        if (sql) {
          query(sql, params, saveCallback);
        } else {
          saveCallback();
        }
      } else {
        cb && cb(new errors.ItemNotValidError('Record did not pass validation'));
      }
    };

    instance.validate = function() {
      var ok      = true,
          column, options, modelValidators, isRequired;
      _errors = [];

      var setError = function(column, type) {
        ok = false;
        _errors.push({ column: column, type: type });
        if (!_errors[column]) {
          _errors[column] = [];
        }
        _errors[column].push(type);
      };

      var applyValidation = function(validation) {
        if (validation) {
          if (typeof validation === 'function') {
            if (!validation(data[column])) {
              setError(column, 'custom');
            }
          } else {
            for (var validationName in validation) {
              if (!validation[validationName](data[column])) {
                setError(column, validationName);
              }
            }
          }
        }
      };

      fireHook('beforeValidate', instance, []);

      for (column in structure) {
        options = structure[column].options;
        modelValidators = modelDefinition.validations && modelDefinition.validations[column];
        isRequired = (options && options.required) || (modelValidators && modelValidators.required);

        if (isRequired) {
          if (!data[column]) {
            setError(column, 'required');
          }
        } else if (structure[column].validation && data[column] !== undef) {
          if (!structure[column].validation(data[column])) {
            setError(column, 'default');
          }
        } else if (modelValidators && data[column] !== undef) {
          if (!modelValidators(data[column])) {
            setError(column, 'default');
          }
        }
        if (data[column]) {
          applyValidation(options && options.validation);
          applyValidation(modelValidators && modelValidators.validation);
        }
      }

      fireHook('afterValidate', instance, [ok]);

      return ok;
    };

    return instance;
  };
};

module.exports = Model;

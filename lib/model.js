var mysql            = require('mysql'),
    jaz              = require('jaz-toolkit'),
    EventEmitter     = require('events').EventEmitter,
    async            = require('async'),

    errors           = require(__dirname + '/errors'),
    types            = require(__dirname + '/data_types'),
    helpers          = require(__dirname + '/helpers'),    

    undef,
    
    QUERY_FIND_WHERE  = 'SELECT #{select} FROM `#{tableName}` #{assocJoin} #{where} #{groupBy} #{order} #{limit};',
    QUERY_JOIN_ASSOCS = 'LEFT JOIN #{assocTableName} ON #{tableName}.id=#{assocTableName}.#{idCol}',
    QUERY_INSERT      = 'INSERT INTO `#{tableName}` (#{columns}) VALUES (#{values});',
    QUERY_DELETE      = 'DELETE FROM `#{tableName}` #{where};',
    QUERY_UPDATE      = 'UPDATE `#{tableName}` SET #{values} WHERE id=#{id};',
    QUERY_HAS_MANY    = 'INSERT IGNORE INTO `#{tableName}` (#{columns}) VALUES #{values};'
;

var Model = function(name, structure, modelDefinition, query) {
  var modelNames          = {
        tableName:       helpers.pluralize(jaz.String.underscore(name)),
        name:            name,
        assocTableIdCol: jaz.String.underscore(name) + '_id'
      },
      fields,
      hookCallbacks       = {},
      hasOneAssociations  = {},
      hasManyAssociations = {},
      thisModel           = this;

  modelDefinition = modelDefinition || {};

  if (!structure.id) {
    structure.id = types.INT();
  }
  fields = Object.keys(structure);

  this.__defineGetter__('name', function() { return modelNames.name; });
  this.__defineGetter__('tableName', function() { return modelNames.tableName; });
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

  /**
   * Adds a hasOne association to given model
   * @param {String|Model} model String of model name or model instance
   */
  this.hasOne = function(model) {
    var self      = this,
        SequelORM = require(__dirname + '/');
    if (typeof model === 'string') {
      SequelORM.once('model_defined', function(definedModel) {
        if (definedModel.name === model) {
          hasOneAssociations[model] = definedModel;
        }
      });
    } else {
      hasOneAssociations[model.name] = model;
    }
  };

  /**
   * Adds a hasMany association to given model
   * @param {String|Model} model String of model name or model instance
   */
  this.hasMany = function(model) {
    var self      = this,
        SequelORM = require(__dirname + '/'),
        addAssoc  = function(definedModel) {
          var attributeName = jaz.String.camelize(definedModel.name),
              tableName     = jaz.String.underscore(attributeName + 's');
          hasManyAssociations[definedModel.name] = {
            model: definedModel,
            names: {
              modelName:           definedModel.name,
              attributeName:       attributeName,
              attributeNamePlural: attributeName + 's',
              tableName:           tableName,
              attributeIdCol:      attributeName+ 'Ids',
              assocTableName:      jaz.String.underscore(thisModel.name) + '_to_' + tableName,
              assocTableIdCol:     jaz.String.underscore(attributeName) + '_id'
            }
          };
        };
    if (typeof model === 'string') {
      SequelORM.once('model_defined', function(definedModel) {
        if (definedModel.name === model) {
          addAssoc(definedModel);
        }
      });
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
        selects     = [modelNames.tableName + '.*'],
        groupBy     = '',
        SequelORM   = require(__dirname + '/');

    if (typeof userParams === 'function') {
      cb = userParams;
      userParams = undef;
    }
    if (typeof search === 'object') {
      sql = jaz.String.interpolate(QUERY_FIND_WHERE, {
        tableName: modelNames.tableName,
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
    // get all hasMany associations
    if (Object.keys(hasManyAssociations).length) {
      groupBy = 'GROUP BY ' + modelNames.tableName + '.id';
      Object.keys(hasManyAssociations).forEach(function(modelName) {
        var assoc = hasManyAssociations[modelName];
        selects.push('GROUP_CONCAT(' + assoc.names.assocTableName + '.' + assoc.names.assocTableIdCol + ') ' + jaz.String.underscore(assoc.names.attributeIdCol) );
        assocJoins.push(jaz.String.interpolate(QUERY_JOIN_ASSOCS, {
          assocTableName: assoc.names.assocTableName,
          tableName:      modelNames.tableName,
          idCol:          jaz.String.underscore(thisModel.name) + '_id'
        }));
      });
    }
    sql = jaz.String.interpolate(sql, {
      limit:     limit,
      select:    selects.join(','),
      assocJoin: assocJoins.join(','),
      groupBy:   groupBy
    });
    SequelORM.log(SequelORM.LOG_LEVEL_INFO, "Sending SQL: " + sql);
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
            recordId = 'id=' + id;
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
    var instance                 = { 'class': name + 'Model' },
        SequelORM                = require(__dirname + '/'),
        isNew                    = !loaded,
        isDirty                  = !loaded,
        deleted                  = false,
        _errors                  = [],
        loadedAssociations       = {},
        loadedManyAssociations   = {},
        manyAssociationsToRemove = {},
        hasManyTableIdCol        = jaz.String.underscore(name) + '_id';
    data = data || {};

    jaz.Object.extend(instance, new EventEmitter());

    // set getter and setter for data
    jaz.Object.each(structure, function(def, key) {
      instance.__defineGetter__(key, function() { return data[key]; });
      instance.__defineSetter__(key, function(value) {
        fireHook('beforeChange', instance, [key, value]);
        data[key] = value;
        isDirty = true;
        fireHook('afterChange', instance, [key, value]);
      });
    });

    // set setter and getter for associations
    Object.keys(hasOneAssociations).forEach(function(modelName) {
      var model      = hasOneAssociations[modelName],
          name       = jaz.String.camelize(modelName),
          getterName = 'get' + modelName,
          setterName = 'set' + modelName,
          removeName = 'remove' + modelName,
          idCol      = name + 'Id';

      // setter
      instance[setterName] = function(value) {
        loadedAssociations[name] = value;
        instance[idCol] = value.id;
        if (!value.id) {
          value.once('save', function() {
            instance[idCol] = value.id;
          });
        }
      };
      instance.__defineSetter__(name, instance[setterName]);

      // getter
      instance[getterName] = function(cb) {
        var Seq = require(__dirname + '/');
        Seq.getModel(modelName).find(instance[idCol], cb);
      };

      // remove function
      instance[removeName] = function() {
        instance[idCol] = 0;
        delete loadedAssociations[name];
      };
    });

    Object.keys(hasManyAssociations).forEach(function(modelName) {
      var model            = hasManyAssociations[modelName].model,
          
          names            = hasManyAssociations[modelName].names,
          name             = names.attributeName,
          idCol            = names.attributeIdCol,
          
          getOneName       = 'get' + modelName,
          setOneName       = 'add' + modelName,
          getterName       = 'get' + helpers.pluralize(modelName),
          setterName       = 'add' + helpers.pluralize(modelName),
          removeOneName    = 'remove' + modelName,
          removeAllName    = 'removeAll' + modelName + 's',
          countName        = 'countAll' + modelName + 's',
          countSavedName   = 'countSaved' + modelName + 's',
          countLoadedName  = 'countLoaded' + modelName + 's',
          countUnsavedName = 'countUnsaved' + modelName + 's',
          countRemoveName  = 'count' + modelName + 'sToRemove';

      data[idCol] = data[idCol] ? jaz.Array.map(data[idCol].split(','), function(id) { return ~~id; }) : [];
      loadedManyAssociations[modelName] = {
        content:      [],
        asHash:       {},
        modelName:    modelName, 
        tableName:    names.assocTableName,
        idCol:        name + '_id',
        unsavedItems: [],
        removedItems: []
      };
      manyAssociationsToRemove[modelName] = [];


      // Setter: .addThing() / .addThings()
      instance[setterName] = instance[setOneName] = function(values) {
        if (arguments.length) {
          var items               = jaz.Object.isArray(arguments[0]) ? arguments[0] : arguments,
              atLeastOneItemIsNew = false;
          if (items.length) {
            jaz.Array.each(items, function(item) {
              var itemIsId       = jaz.Object.isNumber(item),
                  idAlreadyAdded = jaz.Array.include(data[idCol], item.id);
              if (!idAlreadyAdded) {
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
              }
            });
            if (atLeastOneItemIsNew) {
              isDirty = true;
            }
          }
        }
      }

      // Getter: .getThings()
      instance[getterName] = function(cb) {
        var idsToLoad = jaz.Array.reject(data[idCol], function(id) { return loadedManyAssociations[modelName].asHash[id]; });
        if (idsToLoad.length) {
          SequelORM.getModel(modelName).findAll({ where: 'id IN (' + idsToLoad.join(',') + ')' }, function(err, items) {
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
      }

      // Getter: .getThing()
      instance[getOneName] = function(id, cb) {
        var item = loadedManyAssociations[modelName].asHash[id];
        if (item) {
          cb(null, item);
        } else if (!jaz.Array.include(data[idCol], id)) {
          cb(new errors.NotAssociatedItemError("Record does not have an associated " + modelName + " with id=" + id));
        } else {
          SequelORM.getModel(modelName).find(id, function(err, item) {
            if (!err) {
              loadedManyAssociations[modelName].content.push(item);
              loadedManyAssociations[modelName].asHash[item.id] = item;
            }
            cb(err, item);
          });
        }
      }

      // Deleter: .removeThing()
      instance[removeOneName] = function(value) {
        var removeId = jaz.Object.isNumber(value) ? value : value.id;
        if (typeof removeId !== 'undefined') {
          loadedManyAssociations[modelName].content = jaz.Array.reject(loadedManyAssociations[modelName].content, function(item) {
            return item.id == removeId;
          });
          loadedManyAssociations[modelName].unsavedItems = jaz.Array.reject(loadedManyAssociations[modelName].unsavedItems, function(item) {
            return item.id == removeId;
          });
          delete loadedManyAssociations[modelName].asHash[removeId];
          data[idCol] = jaz.Array.without(data[idCol], removeId);
          loadedManyAssociations[modelName].removedItems.push(removeId);
          } else {
            loadedManyAssociations[modelName].content = jaz.Array.without(loadedManyAssociations[modelName].content, value);
            loadedManyAssociations[modelName].unsavedItems = jaz.Array.without(loadedManyAssociations[modelName].unsavedItems, value);
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
     * @param {Number}
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
    instance.remove = function(cb) {
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
      Object.keys(loadedAssociations).forEach(function(name) {
        if (!loadedAssociations[name].id) {
          allAssociationsSaved = false;
          cb(new errors.AssociationsNotSavedError("Association '" + name + "' was not saved."));
        }
      });
      Object.keys(loadedManyAssociations).forEach(function(name) {
        if (jaz.Array.any(loadedManyAssociations[name].content, function(item) { return !item.id; })) {
          allAssociationsSaved = false;
          cb(new errors.AssociationsNotSavedError("Association '" + name + "' was not saved."));
        }
      });
      if (!allAssociationsSaved) {
        return;
      }

      if (isNew) {
        for (i=0,l=fields.length; i<l; ++i) {
          if (fields[i] !== 'id') {
            columns.push(jaz.String.underscore(fields[i]));
            values.push('?');
            params.push(data[fields[i]] || null);
          }
        }
        sql = jaz.String.interpolate(QUERY_INSERT, {
          tableName: modelNames.tableName,
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
          tableName: modelNames.tableName,
          values: values.join(','),
          id: instance.id
        });
      }
      if (instance.validate()) {
        fireHook('beforeSave', instance, []);

        SequelORM.log(SequelORM.LOG_LEVEL_INFO, "Sending SQL: " + sql);
        query(sql, params, function(err, result) {
          var assocQueries = [],
              assocDefinition;

          if (!err) {
            if (isNew) {
              instance.id = result.insertId;
            }

            // hasMany associations
            if (Object.keys(loadedManyAssociations).length) {
              Object.keys(loadedManyAssociations).forEach(function(name) {
                var values     = [],
                    ids        = [],
                    instanceId = ~~instance.id,
                    insertSql, removedSql, itemId, removedIds;

                loadedManyAssociations[name].unsavedItems.forEach(function(item) {
                  itemId = ~~(jaz.Object.isNumber(item) ? item : item.id);
                  values.push('(' + instanceId + ',' + itemId + ')');
                  ids.push(itemId);
                });

                // save hasMany associations
                if (ids.length) {
                  insertSql = jaz.String.interpolate(QUERY_HAS_MANY, {
                    tableName: loadedManyAssociations[name].tableName,
                    columns: hasManyTableIdCol + ',' + jaz.String.underscore(loadedManyAssociations[name].idCol),
                    values: values.join(',')
                  });

                  assocQueries.push(function(callback) {
                    // send the hasMany query for this loadedManyAssociation
                    SequelORM.log(SequelORM.LOG_LEVEL_INFO, "Sending SQL: " + insertSql);
                    
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
                // remove hasMany associations
                if (loadedManyAssociations[name].removedItems.length) {
                  assocDefinition = hasManyAssociations[loadedManyAssociations[name].modelName];
                  removedIds = loadedManyAssociations[name].removedItems;
                  removedSql = jaz.String.interpolate(QUERY_DELETE, {
                    tableName: assocDefinition.names.assocTableName,
                    where: 'WHERE ' + hasManyTableIdCol + '=' + ~~instance.id + ' AND ' + assocDefinition.names.assocTableIdCol + ' IN (' + removedIds.join(',') + ')'
                  });
                  assocQueries.push(function(callback) {
                    // send the hasMany query for this loadedManyAssociation
                    SequelORM.log(SequelORM.LOG_LEVEL_INFO, "Sending SQL: " + removedSql);

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
            cb(err);
          }
        });
      } else {
        cb(new errors.ItemNotValidError('Record did not pass validation'));
      }
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

      fireHook('beforeValidate', instance, []);
      
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

      fireHook('afterValidate', instance, [ok]);

      return ok;
    };

    return instance;
  };
};

module.exports = Model;
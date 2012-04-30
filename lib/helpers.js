"use strict";
var jaz = require('jaz-toolkit');

try {
  var Inflection = require('inflection');
} catch(e) {}

module.exports = {
  /**
   * Generates a pluralized form of given word
   * @method pluralize
   * @param {String} word The word to pluralize
   * @return {String}
   */
  pluralize: function(word) {
    if (Inflection) {
      word = Inflection.pluralize(word);
    } else {
      if (!word.match(/s$/)) {
        word += 's';
      }
    }
    return word;
  },

  /**
   * Returns the corresponding tableName for that modelName
   * @method modelNameToTableName
   * @param {String} modelName1 name of first model
   * @return {String} name of the table
   */
  modelNameToTableName: function(modelName) {
    return this.pluralize(jaz.String.underscore(modelName));
  },

  /**
   * Creates the tablename for the join table of to models
   * @method getJoinTableName
   * @param {String} modelName1 name of first model
   * @param {String} modelName2 name of second model
   * @return {String} name of the join table
   */
  getJoinTableName: function(modelName1, modelName2) {
    var tableName1 = this.modelNameToTableName(modelName1),
        tableName2 = this.modelNameToTableName(modelName2);

    if (tableName1 > tableName2) {
      var tmp = tableName1;
      tableName1 = tableName2;
      tableName2 = tmp;
    }
    return tableName1 + '_to_' + tableName2;
  }
};

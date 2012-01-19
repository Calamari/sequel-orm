var jaz              = require('jaz-toolkit');


module.exports = {
  pluralize: function(word) {
    if (!word.match(/s$/)) {
      word += 's';
    }
    return word;
  },

  /**
   * Returns the corresponding tableName for that modelName
   * @param {String} modelName1 name of first model
   * @return {String} name of the table
   */
  modelNameToTableName: function(modelName) {
    return this.pluralize(jaz.String.underscore(modelName));
  },

  /**
   * Creates the tablename for the join table of to models
   * @param {String} modelName1 name of first model
   * @param {String} modelName2 name of second model
   * @return {String} name of the join table
   */
  getJoinTableName: function(modelName1, modelName2) {
    var tableName1 = this.modelNameToTableName(modelName1),
        tableName2 = this.modelNameToTableName(modelName2);

    if (tableName1 > tableName2) {
      tmp = tableName1;
      tableName1 = tableName2;
      tableName2 = tmp;
    }
    return tableName1 + '_to_' + tableName2;
  }

};

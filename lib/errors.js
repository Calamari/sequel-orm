/**
 * All error types
 */
var errorTypes = [ 'MissingArgumentsError', 'NotADataTypeError', 'DefaultValueForbiddenError', 'TableAlreadyExistsError', 'TableNotFoundError', 'ColumnNotFoundError', 'ItemNotFoundError', 'NotValidColumnError', 'NotSavedYetError', 'NotAValidatorError', 'ItemNotValidError', 'AssociationsNotSavedError', 'AssociationNotDefinedError', 'NotAssociatedItemError' ];

"use strict";

errorTypes.forEach(function(errorName) {
  module.exports[errorName] = function(message, fileName, lineNumber) {
    this.name = errorName;
    this.message = message;
    if (fileName) {
      this.fileName = fileName;
    }
    if (!isNaN(lineNumber)) {
      this.lineNumber = lineNumber;
    }
  };
});

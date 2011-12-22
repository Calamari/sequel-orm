/**
 * All error types
 */
var errorTypes = [ 'MissingArgumentsError' ];

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

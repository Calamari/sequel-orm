/**
 * String enhancement 
 */
var ArrayMethods = require('./Array'),
	firstCharUpperCase = function(str) {
		return str.charAt(0).toUpperCase() + str.substr(1);
	},
	firstCharLowerCase = function(str) {
		return str.charAt(0).toLowerCase() + str.substr(1);
	};

module.exports = {
	beginsWith: function(str, needle) {
		return str.indexOf(needle) === 0;
	},
	endsWith: function(str, needle) {
		return str.indexOf(needle) === str.length - needle.length;
	},
	contains: function(str, needle) {
		return str.indexOf(needle) !== -1;
	},
	words: function(str) {
		return str.split(' ');
	},
	firstCharUpperCase: firstCharUpperCase,
	firstCharLowerCase: firstCharLowerCase,
	toUpperCaseWords: function(str) {
		return ArrayMethods.map(str.words(), function(s) { return firstCharUpperCase(s); }).join(' ');
	},
	camelize: function(str) {
		return firstCharLowerCase(ArrayMethods.map(str.split('_'), function(s) { return firstCharUpperCase(s); }).join(''));
	},
	underscore: function(str) {
		return firstCharLowerCase(str).replace(/([A-Z])/g, '_$1').toLowerCase();
	},
	reverse: function(str) {
		return str.split('').reverse().join('');
	},
	wrap: function(str, width) {
		if (!width) { return str; }
		var len = str.length,
			result = [];
		while (str.length > width) {
			result.push(str.substr(0, width));
			str = str.substr(width);
		}
		result.push(str);
		return result;
	},
	isEmail: function(str) {
		return /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/.test(str);
	},
	interpolate: function(str, data) {
	  for (var key in data) {
	    str = str.replace(new RegExp('#{' + key + '}', 'g'), data[key]);
	  }
	  return str;
	}
};

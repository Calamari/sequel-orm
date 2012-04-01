/**
 * Object enhancements
 */
module.exports = {
	/**
	 * Extends an object with the properties with one or more source objects
	 * But it will NOT override already defined properties
	 */
	careExtend: function(obj) {
		for(var i=1, l=arguments.length; i<l; ++i) {
			var source = arguments[i];
			for (var prop in source) {
				if (!obj.hasOwnProperty(prop)) {
					obj[prop] = source[prop];
				}
			}
		};
		return obj;
	},
	isPlainObject: function(obj) {
		return obj && obj.constructor === Object;
	}
};

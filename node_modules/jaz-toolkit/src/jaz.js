
var underscore = require('underscore');

function enhanceObject(obj, methods) {
	methods.forEach(function(method) {
		obj[method] = underscore[method];
	});
	return obj;
}

var underscoreEnhance = {
	Array: ['first', 'initial', 'last', 'rest', 'compact', 'flatten', 'without', 'union', 'uniq', 'difference', 'intersect', 'zip', 'indexOf', 'lastIndexOf', 'range', 'filter', 'contains'],
	Collection: ['each', 'map', 'reduce', 'reduceRight', 'find', 'detect', 'select', 'reject', 'all', 'any', 'include', 'invoke', 'pluck', 'max', 'min', 'sortBy', 'sortedIndex', 'toArray', 'size'],
	Object: ['values', 'functions', 'extend', 'clone', 'defaults', 'tap', 'isEqual', 'isEmpty', 'isElement', 'isArray', 'isArguments', 'isFunction', 'isString', 'isNumber', 'isBoolean', 'isDate', 'isRegExp', 'isNaN', 'isNull', 'isUndefined'],
	Function: ['bind', 'bindAll', 'memoize', 'delay', 'defer', 'throttle', 'debounce', 'wrap', 'compose']
};

var jaz = {
	'Array': enhanceObject(enhanceObject(require('./Array'), underscoreEnhance.Array), underscoreEnhance.Collection),
	'Number': require('./Number'),
	'Function': enhanceObject(require('./Function'), underscoreEnhance.Function),
	'Object': enhanceObject(enhanceObject(require('./Object'), underscoreEnhance.Object), underscoreEnhance.Collection),
	'String': require('./String'),
	'Date': require('./Date'),

	/**
	 * Adds all or only some methods to the appropriate Object.prototype
	 * @params {String} which Which Property to should be enhanced?
	 * @params {String|String[]} [only] If set mehtod will only enhance object with given methods
	 */
	enhancePrototype: function(which, only) {
		if (!jaz[which]) return null;
		var enhanceAll = typeof only === 'undefined';
		only = Array.isArray(only) ? only : [only];

		jaz.Object.each(jaz[which], function(value, key) {
			if (enhanceAll || only.indexOf(key) !== -1) {
				Object.defineProperty(global[which].prototype, key, {
					value: jaz.Function.methodize(value),
					enumarable: false
				});
			}
		});
	}
};



module.exports = jaz;

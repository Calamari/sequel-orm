/**
 * Function enhancements
 */
module.exports = {
	/*without: function(arr) {
		var args = arguments;
		return arr.filter(function(x) {
			var isIn = false;
			for (var i=args.length; i-->1;) {
				isIn = isIn || x == args[i];
			}
			return !isIn;
		});
	},
	last: function(arr) {
		return arr.length ? arr[arr.length - 1] : undefined;
	},*/
	/**
	 * Shuffles the array
	 * Implementation borrowed from Ryan Tenney: https://prototype.lighthouseapp.com/projects/8886/tickets/721-add-shuffle-method-to-arrays
	 */
	shuffle: function(arr) {
		var shuffled = [], rand;
		arr.forEach(function(value, index) {
			if (index == 0) {
				shuffled[0] = value;
			} else {
				rand = Math.floor(Math.random() * (index + 1));
				shuffled[index] = shuffled[rand];
				shuffled[rand] = value;
			}
		});
		return shuffled;
	},
	/**
	 * Creates a copy of the given array
	 * @param {Array} {arr} The Array
	 * @returns {Array}
	 */
	copy: function(arr) {
		return arr.concat();
	},
	/**
	 * Creates a copy of the given array
	 * Alias of .copy
	 * @param {Array} arr The Array
	 * @returns {Array}
	 */
	clone: function(arr) {
		return arr.concat();
	},
	/**
	 * Returns the greatest value determined by Math.max of all array elements
	 * @param {Array} arr The Array
	 * @param {Function} [iter] A function that returns the value that is used for comparision (if array consists of objects for example)
	 * @returns {Mixed}
	 */
	max: function(arr, iter) {
		var result = null;
		arr.forEach(function(v) {
			if (result === null) {
				result = v;
			} else {
				result = Math.max(result, iter ? iter(v) : v);
			}
		});
	},
	/**
	 * Returns the smallest value determined by Math.min of all array elements
	 * @param {Array} arr The Array
	 * @param {Function} [iter] A function that returns the value that is used for comparision (if array consists of objects for example)
	 * @returns {Mixed}
	 */
	min: function(arr, iter) {
		var result = null;
		arr.forEach(function(v) {
			if (result === null) {
				result = v;
			} else {
				result = Math.min(result, iter ? iter(v) : v);
			}
		});
	}
};

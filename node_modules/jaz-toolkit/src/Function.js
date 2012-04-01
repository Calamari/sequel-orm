/**
 * Function enhancements
 */

module.exports = {
	methodize: function(method) {
		//TODO: use objectDescriptor and hide them in for-in loop
		return function() {
			var args = [this];
			for(var i=0, l=arguments.length; i<l; ++i) {
				args.push(arguments[i]);
			}
			return method.apply(this, args);
		};
	},
	
	wrap: function(func, wrapper) {
		var args = [func];
		for(var i=2, l=arguments.length; i<l; ++i) {
			args.push(arguments[i]);
		}
		return function() {
			for(var i=0, l=arguments.length; i<l; ++i) {
				args.push(arguments[i]);
			}
			console.log(args);
			return wrapper.apply(this, args);
		};
		var args = [func.bind(this)];
		for(var i=2, l=arguments.length; i<l; ++i) {
			args.push(arguments[i]);
		}
		return wrapper.bind(this, args);
	},
	
	nextTick: function(func) {
		process.nextTick(func);
	}
};

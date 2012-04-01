var vows = require('vows'),
	assert = require('assert'),
	jaz = require('../src/jaz');


//module.exports = 
vows.describe('Function')
.addBatch({
	'Jaz.Function has': {
		topic: jaz.Function,
		
		'methodize': function(F) {
			var run = false;
			var obj = {
				doit: function(x) { run = x; }
			};

			var foo = function(element, bla, foo) {
				assert.equal(this, obj);
				assert.equal(bla, 42);
				assert.equal(foo, "foo bar");
			};
			obj.foo = F.methodize(foo);
			obj.foo(42, "foo bar");
		}
	}
}).export(module);

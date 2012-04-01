var vows = require('vows'),
	assert = require('assert'),
	jaz = require('../src/jaz');


//module.exports = 
vows.describe('Jaz.String')
.addBatch({
	'has method': {
		topic: jaz.String,
		
		'beginsWith': function(S) {
			assert.isTrue(S.beginsWith('foobar', 'foo'));
			assert.isFalse(S.beginsWith('^foobar', 'foo'));
			assert.isTrue(S.beginsWith('foöbar$', 'foö'));
			assert.isTrue(S.beginsWith('bla$foöbar$', 'bla$'));
		},

		'endsWith': function(S) {
			assert.isFalse(S.endsWith('foobar', 'foo'));
			assert.isTrue(S.endsWith('foobar', 'bar'));
			assert.isFalse(S.endsWith('^foobar', 'foo'));
			assert.isFalse(S.endsWith('foöbar$', 'bar'));
			assert.isTrue(S.endsWith('bla$foö^bar', '^bar'));
		},
		
		'interpolate': function(S) {
  		var template1 = "test";
		  assert.strictEqual(S.interpolate(template1), "test");
  		var template2 = "test #{foo}";
		  assert.strictEqual(S.interpolate(template2), "test #{foo}");
		  assert.strictEqual(S.interpolate(template2, { foo: 42 }), "test 42");
		  assert.strictEqual(S.interpolate(template2, { foo: "xx" }), "test xx");
		  assert.strictEqual(S.interpolate(template2, { bar: "xx" }), "test #{foo}");
  		var template3 = "test #{foo}-#{foo}";
		  assert.strictEqual(S.interpolate(template3), "test #{foo}-#{foo}");
		  assert.strictEqual(S.interpolate(template3, { foo: 42 }), "test 42-42");
		  assert.strictEqual(S.interpolate(template3, { foo: "xx" }), "test xx-xx");
		  assert.strictEqual(S.interpolate(template3, { bar: "xx" }), "test #{foo}-#{foo}");
		}
	}
}).export(module);

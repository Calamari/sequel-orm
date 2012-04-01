var vows = require('vows'),
	assert = require('assert'),
	jaz = require('../src/jaz');


//module.exports = 
vows.describe('Jaz')
.addBatch({
	'Jaz.enhancePrototype': {
		topic: jaz.Function,
		
		'accepts String as first parameter and enhances all of that respective prototype': function(jaz) {
		},
		
		'accepts a prototype/object as first parameter and can enhance one selected method': function(jaz) {
		},
		
		'accepts an array with prototypes that will be added to prototype': function(jaz) {
		},
		
		'enhances All': function(jaz) {
		}
	}
}).export(module);

var Benchmark = require("Benchmark");


var test = new Benchmark.Suite('Object key traversal', {
  setup: function() {
  }
});

var obj = {
  bla: 'blubb',
  foo: 42,
  thing: new Date()
};

test.add('for var in', function() {
  for (var key in obj) {
    keys[key];
  }
})
.add('for each Object.keys', function() {
  var keys = Object.keys(obj);
  for (var i=0,l=keys.length; i<l; ++i) {
    keys[i];
  }
})
.add('for each Object.keys reverse', function() {
  var keys = Object.keys(obj);
  for (var i=keys.length; i--; ) {
    keys[i];
  }
})
.add('forEach Object.keys reverse', function() {
  var keys = Object.keys(obj);
  keys.forEach(function(key) {
    key;
  });
})
// add listeners
.on('cycle', function(event, bench) {
  console.log(String(bench));
})
.on('complete', function() {
  console.log('Fastest is ' + this.filter('fastest').pluck('name'));
})
// run async
.run({ 'async': true });

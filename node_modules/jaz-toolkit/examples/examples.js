
var jaz = require('../src/jaz');

var o = {
	count: 1
};
jaz.Number.times(4, function(x) {
	this.count += this.count;
}, o);
console.log("4 times:", o.count);

var obj = {
	doit: function(x) { return "->" + x; }
};

var foo = function(element, bla) {
	element.x = "gaetjgoie";
	return element.doit(bla);
};

obj.x = null;
obj.foo = jaz.Function.methodize(foo);
console.log("after:", obj.foo(23));
console.log(obj);

var testFunc = function(what) {
	console.log("printed: ", what);
};

testFunc("test");

var f = jaz.Function.wrap(testFunc, function(origFunc, what) {
	origFunc(what);
	console.log("or not?");
});

f("wrapp me");

//Number.prototype['times'] = jaz.Function.methodize(jaz.Number.times);


jaz.enhancePrototype('Number');

(3).times(function(x) { console.log(x);});

jaz.enhancePrototype('Array', ['without', 'last']);

console.log([1,2,3,4].without(1, 3, 5));
console.log(["a","s","d","f"].last());
console.log(jaz.Array.shuffle(["a","s","d","f"]));

console.log(jaz.Array.uniq([1, 3, 5, 3, 4, 5, 1]));
console.log(jaz.Array.uniq(5));


Object.defineProperty(Object.prototype, 'foo', {
	value: function() { console.log(333); },
	enumarable: false
});
Object.prototype.bla = 3;

var x = {};
x.foo();

var o = [];
o.foo();

var d = 432;
for (var i in d) console.log(i);

var a = {
	foo: 42
};

jaz.Object.careExtend(a, {
	foo: 23,
	bla: 'blubb'
});

console.log(Object.keys({
	foo: 23,
	blablubb: 'blubb'
}));

console.log(jaz.String.reverse("a.constructor"));
console.log(o.constructor === Object);

jaz.enhancePrototype('Function', 'nextTick');
(function() { console.log(53); }).nextTick();
console.log(a);

console.log((5).toPaddedString(2));

console.log((325).toPaddedString(2));

console.log((6).toPaddedString(4, 2));


jaz.enhancePrototype('String');

console.log("bla bla blubb sex".toUpperCaseWords());

console.log("bla_bla_blubb_".camelize());
console.log("bla_bla_blubb_".camelize().underscore());

var teststr = "bla bla blubb sex";
console.log(teststr.wrap(5));
console.log(teststr);

console.log("max", jaz.Array.max([43,3,44,1]));
console.log("min", jaz.Array.min([42,3,53,1,-7]));

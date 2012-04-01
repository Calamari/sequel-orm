# Jaz.Toolkit

This is a collection of a lot of useful methods, that are missing in the JavaScript language itself. I will add more methods and algorithms to it in time.

## Philosophy of Jaz.Toolkit

It should offer a wide variability of how to use it and should never extend the protoype of any object if you do not want that. Instead it offers you convenience methods that can do that if you like.

## Install

Check out this repo and use it. *(TODO: add this to npm)*

## Usage

You can use it simply like this:

    var jaz = require(__dirname + '/lib/jaz');
    
    var a = jaz.Array.shuffle([1,2,3,4]); // a === [2,1,4,3] or similar
    var b = jaz.String.words('you are my hero'); // b === ['you', 'are', 'my', 'hero']

Or like this:

    var $Number = require(__dirname + '/lib/jaz').number;
    
    var c = $Number.toPaddedString(5, 3); // c === '005'

Or if you are fine with enhancing your prototypes, it get's simpler:

    var jaz = require(__dirname + '/lib/jaz');
    jaz.enhancePrototype('Array', ['without', 'last']);
    
    var d = [1,2,3,4].without(1, 3); // d === [2, 4]
    
    // or enhancing your prototype with all available methods:
    jaz.enhancePrototype('String');

## Examples

See some examples in the examples directory.

## TODO / Feature Ideas

* Clean up the examples and the tests
* Write some more comments
* Provide readable docs
* Create a npm package of this
* Add more useful stuff...
* Maybe add an algorithm object containing useful algorithms...

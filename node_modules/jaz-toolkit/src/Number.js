/**
 * Number enhancement 
 */
module.exports = {
	times: function(val, callbackfn, thisArg) {
		for(var i=1; i<=val; ++i) {
			callbackfn.call(thisArg || this, i);
		}
	},
	toPaddedString: function(val, len, radix) {
		len = len || 0;

		var strval = val.toString(radix || 10);
		for(var i=0, l=len-strval.length; i<l; ++i) {
			strval = '0' + strval;
		}
		return strval;
	}
};

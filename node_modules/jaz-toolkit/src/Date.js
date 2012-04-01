/**
 * Date enhancements
 */
module.exports = {
	toMySQLString: function(date) {
		return date.toISOString().replace('T', ' ').split('.')[0];
	},
	fromMySQLString: function(dateString) {
		var parts = dateString.replace(/-/g, ' ').replace(/:/g, ' ').split(' ');
		return new Date(Date.UTC(parts[0], parts[1]-1, parts[2], parts[3], parts[4], parts[5]));
	}
};

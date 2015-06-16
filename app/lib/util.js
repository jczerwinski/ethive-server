module.exports = {
	isEmpty: function (obj) {
		for (var prop in obj) {
			return false;
		}
		return true;
	}
};
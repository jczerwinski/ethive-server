var users = [
	{
		id: "jczerwinski",
		pw: "test"
	}
];

module.exports = function * () {
	var user = this.request.body;
	console.log(user);
	this.body = yield users[0];
};
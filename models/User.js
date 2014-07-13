var users = [
	{
		email: 'jamie.czerwinski@gmail.com',
		password: 'test'
	}
]

function User (user) {
	this.email = user.email;
	this.password = user.password;
	this.verifyPassword = function (password) {
		return this.password === password;
	};
};

User.findOne = function (user) {
	return new Promise(function (resolve) {
		resolve(new User(users.find(function(usr) {
			return user.email === usr.email;
		})));
	});
};

module.exports = User;
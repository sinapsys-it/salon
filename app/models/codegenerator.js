var SHA256 = require('crypto-js/sha256');

function generarPassword(model, cb) {
	var random = Math.random() * (15 - 0) + 0;
	var password = (random).toString(16);
	password = password.split('.')[1].substring(0, 6);

	resultado(model, password, function(newpass){
		cb(newpass);
	});
}

function resultado(model, password, cb){
	model.find({contrasenia: SHA256(password).toString()})
	.lean()
	.exec(function(err, data){
		if (data.length > 0) {
			var random = Math.random() * (15 - 0) + 0;
			var newpass = (random).toString(16);
			newpass = newpass.split('.')[1].substring(0, 6);

			resultado(model, newpass, cb);
		}
		else{
			cb(password);
		}
	});
}

module.exports = {
	generarPassword: generarPassword
};
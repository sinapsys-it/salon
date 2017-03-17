//Definicion del modelo de un dispositivo!
var mongoose = require('mongoose');
var winston			= require('winston');

var dispositivoSchema = mongoose.Schema({
	uuid: String
});

var dispositivo = mongoose.model('dispositivos', dispositivoSchema);

/******************* SERVICIO REST PARA CONSULTAS DE APLICACION MOBILE! =) *******************/
module.exports.obtenerDispositivo = function(req, res){
	console.log(req.params.uuid);

	dispositivo.find({
		uuid: req.params.uuid
	}, function(err, data){
		if(err){
			winston.error("Error: " + err);
		}
		else{
			winston.debug("Dispositivo: " + data);

			if(data != ''){
				res.json(true);
			}
			else{
				res.json(false);
			}
		}
	});
};

module.exports.registrarDispositivo = function(req, res){	
	var dispositivoNuevo = new dispositivo({
		uuid: req.body.uuid
	});

	if(req.body.usuarioExiste == 'false'){
		dispositivoNuevo.save(function(err, data){
			if(err){
				winston.error("Error: " + err);
			}
			else{
				winston.debug("Dispositivo: " + data);
				res.json(data);
			}
		});
	}
	else{
		res.json({uuid: req.body.uuid});
	}
};

module.exports.eliminar = function(req, res){
	dispositivo.remove({uuid: req.params.uuid}, function(err, data){
		if (err){
			winston.error("Error: " + err);
            res.send(err);
        }

		res.json(data);
    });
};

//Definicion del modelo de formas de pago!
var mongoose = require('mongoose');
var winston			= require('winston');

var especialidadSchema = mongoose.Schema({
	nombre: String,
	administrador: mongoose.Schema.Types.ObjectId
});

var especialidad = mongoose.model('especialidades', especialidadSchema);

/******************* SERVICIO REST PARA CONSULTAS DE APLICACION WEB! =) *******************/
module.exports.obtenerEspecialidadesByAdmin = function(req, res) {
	especialidad.find({ administrador: req.params.idAdmin })
	.sort({'nombre': 1})
    .exec(function(err, data) {
        if (err){
            res.send(err);
        }
        res.json(data);
    });
};

module.exports.obtenerEspecialidades = function(req, res) {
	especialidad.find({})
    .exec(function(err, data) {
        if (err){
            res.send(err);
        }

        res.json(data);
    });
};

module.exports.obtenerEspecialidadById = function(req, res) {
	especialidad.findById(req.params.id)
    .exec(function(err, data) {
        if (err){
            res.send(err);
        }

        res.json(data);
    });
};

module.exports.crearByAdmin = function(req, res) {
	var auxEspecialidad = new especialidad({
		nombre: req.params.nombre,
		administrador: req.params.idAdmin
	});
	
	auxEspecialidad.save(function(err, data){
		if(err){
			winston.error("Error generando especialidad");
		}
		else{
			res.json(data);
		}
	});
};

module.exports.crear = function(req, res) {
	var auxEspecialidad = new especialidad({
		nombre: req.params.nombre
	});
	
	auxEspecialidad.save(function(err, data){
		if(err){
			winston.error("Error generando especialidad");
		}
		else{
			res.json(data);
		}
	});
};

module.exports.eliminar = function(req, res) {
	especialidad.remove({_id: req.params.id}, function(err, data){
		if (err){
			winston.debug("An error has ocurred while deleting clientes entity. See de details below:");
            res.send(err);
        }

		res.json(data);
    });
};
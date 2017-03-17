//Definicion del modelo de un usuario!
var mongoose = require('mongoose');
var winston			= require('winston');
var consorcioEntity = mongoose.model('consorcios');

var telefonoSchema = mongoose.Schema({
	nombreApellido: String,
	telefono: String,
	celular: String,
	especialidades: [{ 
						type: mongoose.Schema.Types.ObjectId,
						ref: 'especialidades'
					}],
	mail: String,
	activo: Boolean,
	consorcios: [{
					type: mongoose.Schema.Types.ObjectId,
					ref: 'consorcios'
				}],
	fechaAlta: Date,
	fechaBaja: Date
});
var telefonos = mongoose.model('telefonos', telefonoSchema);

/******************* SERVICIO REST PARA CONSULTAS DE APLICACION WEB! =) *******************/
module.exports.obtenerTelefonos = function(req, res) {
	telefonos.find({})
    .populate({path: 'consorcios', select: 'direccion'})
    .populate('especialidades')
    .exec(function(err, data) {
        if (err){
            res.send(err);
        }

        res.json(data);
    });
};

module.exports.obtenerTelefonoByEspecialidadId = function(req, res) {
	telefonos.find({especialidades: {$in: [req.params.idEspecialidad]}})
	.select('fechaAlta')
    .exec(function(err, data) {
        if (err){
            res.send(err);
        }

        res.json(data);
    });
};

module.exports.obtenerTelefonosByAdmin = function(req, res){
	consorcioEntity.find({ administrador: req.params.idAdministrador})
    .select('_id')
    .exec(function(error, consorcios){
		telefonos.find({ consorcios: { "$in" : consorcios } })
		.populate({path: 'consorcios', select: 'direccion'})
		.populate({path: 'especialidades', select: 'nombre'})
	    .exec(function(err, data) {
	        if (err){
	            res.send(err);
	        }

	        res.json(data);
	    });
	});    
};

module.exports.cambiarEstado = function(req, res){
	telefonos.findById(req.params.id, function (err, telefono) {
		var estadoActual = telefono.activo;
		telefono.activo = !estadoActual;
		
		telefono.save(function (err, data) {
			if (!err) {
			  res.json(data);
			} 
			else {
			  winston.error(err);
			}
		});
	});
};

module.exports.obtenerTelefonoByConsorcioId = function(req, res) {
	telefonos.find({'consorcios' : req.params.id})
	.populate({path: 'consorcios', select: 'direccion'})
	.populate({path: 'especialidades', select: 'nombre'})
    .exec(function(err, data) {
        if (err){
            res.send(err);
        }
        else{
	        winston.debug("Telefonos: " + data);
	        res.json(data);
        }
    });
};

module.exports.crear = function(req, res) {

	var telefono = new telefonos({
    	nombreApellido: req.body.telefono.nombreApellido,
        telefono: req.body.telefono.telefono,
        celular: req.body.telefono.celular,
        especialidades: req.body.telefono.especialidades,
        activo: false,
        mail: req.body.telefono.mail,
        consorcios: req.body.telefono.consorcios,
        fechaAlta: new Date(),
        fechaBaja: ''
	});
	
	telefono.save(function(err,data){
		if(err){
			winston.error("Error: " + err);
		}
		else{
			winston.debug("Consorcio: " + data);
			res.json(data);
		}
	});
};

module.exports.editar = function (req, res){
	return telefonos.findById(req.params.id, function (err, telefono) {
		telefono.nombreApellido = req.body.telefono.nombreApellido;
	    telefono.telefono       = req.body.telefono.telefono;
	    telefono.celular        = req.body.telefono.celular;
	    telefono.especialidades = req.body.telefono.especialidades;
	    telefono.mail           = req.body.telefono.mail;
	    telefono.consorcios     = req.body.telefono.consorcios;
	
		return telefono.save(function (err) {
		  if (!err) {
		    winston.debug("telefono updated");
			    winston.debug(JSON.stringify(telefono));
			  } else {
			    winston.error(err);
			  }
			  return res.send(telefono);
			});
	});
};

module.exports.eliminar = function(req, res){
	telefonos.remove({_id: req.params.id}, function(err, data){
		if (err){
            res.send(err);
        }

		res.json(data);
    });
};

/******************* SERVICIO REST PARA CONSULTAS DE APLICACION MOBILE! =) *******************/
module.exports.obtenerTelefonos = function(req, res){
	telefonos.find({$and: [{activo: true}, {consorcios: {$in: [req.params.idConsorcio]}}]})
	.populate([{path: 'consorcios'}, {path: 'especialidades'}])
	.exec(function(err, data){
		if(err){
			winston.error("Error: " + err);
		}
		else{
			winston.debug("Telefonos: " + data);
			res.json(data);
		}
	});
};


module.exports.obtenerTelefono = function(req, res){
	telefonos.findById(req.params.idTelefono)
	.exec(function(err, data){
		if(err){
			winston.error("Error: " + err);
		}
		else{
			winston.debug("Telefonos detalle: " + data);
			res.json(data);
		}
	});
};
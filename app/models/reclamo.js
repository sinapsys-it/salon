//Definicion del modelo de un reclamo!
var mongoose	= require('mongoose');
var winston			= require('winston');
var fs			= require("fs");
var gm			= require("gm").subClass({imageMagick: true});
var consorcioEntity = mongoose.model('consorcios');

var reclamoSchema = mongoose.Schema({
	usuarioRemitente: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'usuarios'
	},
	consorcio: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'consorcios'
	},
	leido: Boolean,
	mensaje: String,
	piso: {
		numero: String,
		depto: {
			nombre: String,
		}
	},
	lote: {
		numero: String
	},
	adjuntoReclamo: [{
		type: mongoose.Schema.Types.ObjectId,
        ref: 'archivos'
	}],
	tieneImg: Boolean,
	fechaAlta: Date,
	fechaBaja: Date
});


var reclamo = mongoose.model('reclamos', reclamoSchema);

/******************* SERVICIO REST PARA CONSULTAS DE APLICACION WEB! =) *******************/
module.exports.obtenerFiltroAniosByAdmin = function(req,res){
	var ddlAnios = [];
	
	consorcioEntity.find({ administrador: req.params.idAdministrador })
    .select('_id')
    .exec(function(error, consorcios){
        reclamo.find({ consorcio: { "$in" : consorcios } })
		.sort({fechaAlta:-1})
		.limit(1)
		.exec(function(err, ultimo){
			if(ultimo != undefined && ultimo != ''){
				var fechaFinal = ultimo[0].fechaAlta.getFullYear();
				reclamo.find({ consorcio: { "$in" : consorcios } })
				.sort({fechaAlta:1})
				.limit(1)
				.exec(function(err, primero){
					if(primero != undefined && primero != ''){
						var fechaInicial = primero[0].fechaAlta.getFullYear();
						for (var i = fechaInicial; i <= fechaFinal; i++) {
							ddlAnios.push(i);
						};
					}
					else{
						ddlAnios.push(fechaFinal);
					}
					res.json(ddlAnios);
				});
			}
			else{
				res.json(false);
			}
		});
    });
}

module.exports.obtenerReclamosPorIdConsorcio = function(req,res){
	reclamo.find({consorcio: req.params.id})
	.populate('consorcio')
	.populate('usuarioRemitente')
	.sort({fechaAlta: -1})
	.exec(function(err, data){
		if(err){
			winston.error("Error: " + err);
		}
		else{
			winston.debug("Mis pagos: " + data);
			res.json(data);
		}
	});
}

module.exports.obtenerReclamosByAdmin = function(req, res){
	consorcioEntity.find({ administrador: req.params.idAdministrador})
    .select('_id')
    .exec(function(error, consorcios){
    	reclamo.find({ consorcio: { "$in" : consorcios } })
    	.populate({path: 'consorcio',
    			   select: 'direccion'
	    })
    	.populate({path: 'usuarioRemitente',
    			   select: 'nombreApellido'
	    })
    	.sort({fechaAlta: -1})
	    .exec(function(err, data) {
	        if (err){
	            res.send(err);
	        }
	        res.json(data);
	    });
	});    
};

module.exports.obtenerAdjuntoReclamo = function (req, res){
    reclamo.findById(req.params.id)
    .exec(function (err, data){
        if (err) {
            res.send(err);
        }
        
        var imagen;
        
        if(data.adjuntoReclamo.data != undefined){
	        var datos = new Buffer(data.adjuntoReclamo.data).toString('base64');
	        var contentType = data.adjuntoReclamo.contentType;
	        var imagen = 'data:' + contentType + ';base64,' + datos;
        }
        else{
        	imagen = "";
        }
        
        res.json(imagen);
    });
};

module.exports.markReadReclamo = function(req, res){
	reclamo.findById(req.body.reclamoId)
	.exec(function(error, data){
		if(error){
			winston.error("Error: " + error);
		}
		else{
			data.leido = req.body.leido;
			data.save();

			res.json(data);
		}
	});
};

/******************* SERVICIO REST PARA CONSULTAS DE APLICACION MOBILE! =) *******************/
module.exports.obtenerReclamos = function(req, res){
	reclamo.find({$and: [{consorcio: req.query.idConsorcio}, {usuarioRemitente: req.query.idUsuario}]})
	.populate('consorcio')
	.sort({leido: 1, fechaAlta: -1})
	.exec(function(err, data){
		if(err){
			winston.error("Error: " + err);
		}
		else{
			winston.debug("Mis reclamos: " + data);
			res.json(data);
		}
	});
};

module.exports.obtenerReclamo = function(req, res){
	reclamo.findById(req.params.idReclamo)
	.exec(function(err, data){
		if(err){
		winston.error("Error: " + err);
		}
		else{
			winston.debug("Reclamo detalle: " + data);
			res.json(data);
		}
	});
};

module.exports.nuevoReclamo = function(req, res){
	var reclamoNuevo = new reclamo({
		usuarioRemitente: req.body.usuarioRemitente,
		consorcio: req.body.consorcio,
		leido: req.body.leido,
		asunto: req.body.asunto,
		mensaje: req.body.mensaje,
		piso: {
			numero: req.body.piso.numero,
			depto: {
				nombre: req.body.piso.dpto.nombre
			}
		},
		lote: {
			numero: req.body.lote.numero
		},
		adjuntoReclamo: req.body.adjuntoReclamo,
		tieneImg: req.body.tieneImg,
		fechaAlta: req.body.fechaAlta,
		fechaBaja: req.body.fechaBaja
	});
	
	reclamoNuevo.save(function(err, data){
		if(err){
			winston.error("Error: " + err);
		}
		else{
			winston.debug("Reclamo: " + data);
			res.json(data);
		}
	});
};
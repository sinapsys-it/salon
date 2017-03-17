//Definicion del modelo de un pago!
var mongoose	= require('mongoose');
var winston			= require('winston');
var fs			= require("fs");
var consorcioEntity = mongoose.model('consorcios');

var pagoSchema = mongoose.Schema({
	usuarioRemitente: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'usuarios'
	},
	consorcio: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'consorcios'
	},
	formaPago: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'formaspagos'
	},
	codigosConsorcio: String,
	leido: Boolean,
	importe: Number,
	fechaPago: Date,
	adjuntoPago: [{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'archivos'
	}],
	piso: {
		numero: String,
		depto: {
			nombre: String,
		}
	},
	lote: {
		numero: String
	},
	observaciones: String,
	tieneImg: Boolean,
	fechaAlta: Date,
	fechaBaja: Date
});

var pago = mongoose.model('pagos', pagoSchema);
/******************* SERVICIO REST PARA CONSULTAS DE APLICACION WEB! =) *******************/
module.exports.obtenerPagosPorIdConsorcio = function(req,res){
	pago.find({consorcio: req.params.id})
	.populate('consorcio')
	.populate('usuarioRemitente')
	.populate('formaPago')
	.sort({fechaPago: -1})
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

module.exports.obtenerPagosByAdmin = function(req, res){
	consorcioEntity.find({ administrador: req.params.idAdministrador})
    .select('_id')
    .exec(function(error, consorcios){
    	pago.find({ consorcio: { "$in" : consorcios } })
    	.populate('consorcio')
    	.populate('usuarioRemitente')
    	.populate('formaPago')
    	.sort({fechaPago: -1})
	    .exec(function(err, data) {
	        if (err){
	            res.send(err);
	        }
	        res.json(data);
	    });
	});    
};

module.exports.obtenerFiltroAniosByAdmin = function(req,res){
	var ddlAnios = [];
	
	consorcioEntity.find({ administrador: req.params.idAdministrador })
    .select('_id')
    .sort({periodo:-1})
    .exec(function(error, consorcios){
        pago.find({ consorcio: { "$in" : consorcios } })
		.sort({periodo:-1})
		.exec(function(err, ultimo){
			if(ultimo != undefined && ultimo != ''){
				var fechaFinal = ultimo[0].fechaAlta.getFullYear();
				pago.find({ consorcio: { "$in" : consorcios } })
				.sort({periodo:1})
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
};

module.exports.obtenerFiltroAniosPagosByAdmin = function(req,res){
	var ddlAnios = [];
	
	consorcioEntity.find({ administrador: req.params.idAdministrador })
    .select('_id')
    .sort({periodo:-1})
    .exec(function(error, consorcios){
        pago.find({ consorcio: { "$in" : consorcios } })
		.sort({periodo:-1})
		.exec(function(err, ultimo){
			if(ultimo != undefined && ultimo != ''){
				var fechaFinal = ultimo[0].fechaPago.getFullYear();
				pago.find({ consorcio: { "$in" : consorcios } })
				.sort({periodo:1})
				.exec(function(err, primero){
					if(primero != undefined && primero != ''){
						var fechaInicial = primero[0].fechaPago.getFullYear();
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
		});
    });
};

module.exports.markRead = function(req, res){
	pago.findById(req.body.pagoId)
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
module.exports.obtenerPagos = function(req, res){
	pago.find({codigosConsorcio: req.params.codigosConsorcio})
	.populate({path: 'consorcio.codigo', match: {'consorcio.codigo': req.params.codigosConsorcio.substring(0, 5)}})
	.populate([{path: 'usuarioRemitente'}, {path: 'formaPago'}])
	.sort({fechaPago: -1})
	.exec(function(err, data){
		if(err){
			winston.error("Error: " + err);
		}
		else{
			winston.debug("Mis pagos: " + data);
			res.json(data);
		}
	});
};

module.exports.nuevoPago = function(req, res){
	winston.debug(req.body);
	var pagoNuevo = new pago({
		usuarioRemitente: req.body.usuarioRemitente,
		consorcio: req.body.consorcio,
		codigosConsorcio: req.body.codigos,
		importe: req.body.importe,
		fechaPago: req.body.fechaPago,
		formaPago: req.body.formaPago,
		adjuntoPago: req.body.adjuntoPago,
		tieneImg: req.body.tieneImg,
		leido: req.body.leido,
		observaciones: req.body.observaciones,
		piso: {
			numero: req.body.piso != '' ? req.body.piso.numero : '',
			depto: {
				nombre: req.body.piso != '' ? req.body.piso.dpto.nombre : ''
			}
		},
		lote: {
			numero: req.body.lote != '' ? req.body.lote.numero : ''
		},
		fechaAlta: req.body.fechaAlta,
		fechaBaja: req.body.fechaBaja
	});
	
	pagoNuevo.save(function(err, data){
		if(err){
			winston.error("Error: " + err);
		}
		else{
			winston.debug("Pago: " + data);
			res.json(data);
		}
	});
};

module.exports.obtenerPago = function(req, res){
	pago.findById(req.params.idPago)
	.populate('formaPago')
	.exec(function(err, data){
		if(err){
			winston.error("Error: " + err);
		}
		else{
			winston.debug("Pago detalle: " + data);
			res.json(data);
		}
	});
};
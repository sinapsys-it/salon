//Definicion del modelo de una sugerencia!
var mongoose	= require('mongoose');
var winston			= require('winston');
var fs			= require("fs");
var consorcioEntity = mongoose.model('consorcios');
var ObjectId = mongoose.Schema.Types.ObjectId;
var gcm 			= require('node-gcm');

var votacionSchema = mongoose.Schema({
	consorcio: {
		type: ObjectId,
		ref:'consorcios'
	},
	idAdministrador:{
		type: ObjectId,
		ref:'usuarios'
	},
	opciones:[{
		idOpcion: Number,
		porcentaje: Number,
		descripcion: String,
		imagen: {
			type: ObjectId,
			ref:'archivos'
		}
	}],
	votos: [{
		idOpcion: Number,
		codigoUnidad: String,
		idUsuario: {
			type: ObjectId,
			ref: 'usuarios'
		}
	}],
	tieneImg: Boolean,
	adjuntosVotacion: [{
    	type: mongoose.Schema.Types.ObjectId,
        ref: 'archivos'
    }],
	fechaFin: Date,
	descripcion: String,
	multiple: Boolean,
	cancelada: Boolean,
	cerrada: Boolean,
	comentarioActivo: Boolean,
	asunto: String,
	comentarios:[{
		idUsuario: {
			type: ObjectId,
			ref: 'usuarios'
		},
		comentario: String,
		fechaAlta: Date
	}],
	fechaAlta: Date,
	fechaBaja: Date
});

var votaciones = mongoose.model('votaciones', votacionSchema);

/******************* SERVICIO REST PARA CONSULTAS DE APLICACION WEB! =) *******************/
module.exports.obtenerVotacionesByConsorcio = function(req, res){
	votaciones
	.find({$and: [{consorcio: req.params.id} ,{fechaFin: {$gte: new Date()}}]})
	.populate({path: 'consorcio', select: 'direccion'})
	.populate({path: 'idUsuario', select: 'nombreApellido'})
	.sort({fechaFin:1})
	.exec(function(err, votacionesVigentes){
		if(err){
			res.send(err);
		}
		else{
			votaciones
			.find({$and: [{consorcio: req.params.id} ,{fechaFin: {$lt: new Date()}}]})
			.populate({path: 'consorcio', select: 'direccion'})
			.populate({path: 'idUsuario', select: 'nombreApellido'})
			.sort({fechaFin:1})
			.exec(function(err, votacionesFinalizadas){
				var votaciones = votacionesVigentes;
				for (var i = 0; i < votacionesFinalizadas.length; i++) {
					votaciones.push(votacionesFinalizadas[i]);
				};
				res.json(votaciones);
			});
		}	
	});
}

module.exports.obtenerVotacionesByAdmin = function(req, res){
	consorcioEntity.find({ administrador: req.params.idAdministrador})
    .select('_id')
    .exec(function(error, consorcios){
        votaciones.find({$and: [{consorcio: { "$in" : consorcios } },{fechaFin: {$gte: new Date()}}]})
        .populate({
            path: 'consorcio',
            match: { administrador: req.params.idAdministrador },
            select: 'direccion codigo'
        })
        .populate({
        	path: 'comentarios.idUsuario',
        	 select: 'nombreApellido'
        })
        .sort({fechaFin:1})
        .exec(function(err, votacionesVigentes) {
            if (err){
                res.send(err);
            }
            else
            {
	            votaciones.find({$and: [{ consorcio: { "$in" : consorcios } } ,{fechaFin: {$lt: new Date()}}]})
		        .populate({
		            path: 'consorcio',
		            match: { administrador: req.params.idAdministrador },
		            select: 'direccion codigo'
		        })
		        .populate({
		        	path: 'comentarios.idUsuario',
		        	 select: 'nombreApellido'
		        })
		        .sort({fechaFin:1})
		        .exec(function(err, votacionesFinalizadas) {
		            if (err){
		                res.send(err);
		            }
		            else
		            {
		            	var votaciones = votacionesVigentes;
						for (var i = 0; i < votacionesFinalizadas.length; i++) {
							votaciones.push(votacionesFinalizadas[i]);
						};
						res.json(votaciones);
	            	}
	            })
	        }
        });
    });
}

module.exports.crear = function(req, res){
	
	var votacion_aux = new votaciones({
		consorcio: req.body.votacion.consorcio,
		idAdministrador: req.body.votacion.idAdminitrador,
		opciones: req.body.votacion.opciones,
		//votos: [],Los votos son posteriores a la creación
		fechaFin: req.body.votacion.fechaFin,
		descripcion: req.body.votacion.descripcion,
		multiple: req.body.votacion.multiple,
		cancelada: req.body.votacion.cancelada,
		cerrada: req.body.votacion.cerrada,
		comentarioActivo: req.body.votacion.comentarioActivo,
		asunto: req.body.votacion.asunto,
		adjuntosVotacion: req.body.votacion.adjuntosVotacion,
		tieneImg: req.body.votacion.tieneImg,
		//comentarios: [],Los comentarios son posteriores a la creación
		fechaAlta: new Date()
	});
	
	votacion_aux.save(function(err,data){
        if(err){
            winston.error("Error: " + err);
        }
        else{
            winston.debug("Consorcio: " + data);
            
            var host = req.get('host');
			if (host.substring(0, 9) != 'localhost')
			{
				var consorcios = [];
				consorcios.push(data.consorcio);
				sendNotificationByCondominium(consorcios, data._id, 'Has recibido una nueva votación!', 'Votación', consorcioEntity);
			}

            res.json(data);
        }
	});
	
}

module.exports.eliminar = function(req, res){
	votaciones
	.find({ consorcio: req.params.id })
	.populate({path: 'consorcio', select: 'direccion'})
	.exec(function(err, votaciones){
		if(err){
			res.send(err);
		}
		else{
			res.json(votaciones);
		}
	});
}

module.exports.cancelar = function(req, res){
	votaciones
	.findById(req.params.id)
	.populate({path: 'consorcio', select: 'direccion'})
	.exec(function(err, votacion){
		if(err){
			res.send(err);
		}
		else{
			
		}
	});
}


/******************* SERVICIO REST PARA CONSULTAS DE APLICACION MOBILE! =) ****************/
module.exports.obtenerVotosVigentes = function(req, res){
	votaciones.find({$and: [{consorcio: req.params.idConsorcio}, {fechaFin: {$gte: new Date()}}]})
	.sort({ fechaAlta: -1 })
	.exec(function(err, data){
		if(err){
			winston.error("Error: " + err);
		}
		else{
			winston.debug("Votaciones vigentes: " + data);
			
			res.json(data);
		}
	});
};

module.exports.obtenerVotosFinalizados = function(req, res){
	votaciones.find({$and: [{consorcio: req.params.idConsorcio}, {fechaFin: {$lt: new Date()}}]})
	.sort({ fechaAlta: -1 })
	.exec(function(err, data){
		if(err){
			winston.error("Error: " + err);
		}
		else{
			winston.debug("Votaciones finalizadas: " + data);
			
			res.json(data);
		}
	});
};

module.exports.obtenerVotacion = function(req, res){
	votaciones.findById(req.params.idVotacion)
	.populate('comentarios.idUsuario')
	.populate({
        path: 'consorcio',
        select: 'direccion codigo'
    })
	.exec(function(err, data){
		if(err){
			winston.error("Error: " + err);
		}
		else{
			winston.debug("Votacion: " + data);

			res.json(data);
		}
	});
};

module.exports.votar = function(req, res){
	votaciones.findById(req.body.idVotacion)
	.exec(function(err, data){
		if(err){
			winston.error("Error: " + err);
		}
		else{

			if(data.votos.length == 0){
				for(var vt = 0; vt < req.body.votos.length; vt++){
					var voto = {
						idOpcion: req.body.votos[vt].idOpcion,
						codigoUnidad: req.body.votos[vt].unidad,
						idUsuario: req.body.votos[vt].idUsuario
					};

					data.votos.push(voto);
				}
			}
			else{
				var votos_aux = [];

				//separo los votos que no son mios
				for(var v = 0; v < data.votos.length; v++){
					if(data.votos[v].codigoUnidad != req.body.votos[0].unidad){
						votos_aux.push(data.votos[v]);
					}
				}
				
				//vacio todos los votos
				data.votos = [];
				
				//agrego mis votos modificados a los anteriores
				for(var vt = 0; vt < req.body.votos.length; vt++){
					var voto = {
						idOpcion: req.body.votos[vt].idOpcion,
						codigoUnidad: req.body.votos[vt].unidad,
						idUsuario: req.body.votos[vt].idUsuario
					};

					votos_aux.push(voto);
				}
				
				//guardo todos los votos modificados
				data.votos = votos_aux;
			}

			for (var i = 0; i < data.opciones.length; i++) {
				var cantidad = 0;
				for (var j = 0; j < data.votos.length; j++) {
					if( data.opciones[i].idOpcion == data.votos[j].idOpcion)
					{
						cantidad++;
					}
				}
				data.opciones[i].porcentaje = cantidad * 100 / data.votos.length;
			}

			data.save(function(errS, dataS){
				if(errS){
					winston.error("Error al guardar: " + errS);
				}
				else{
					winston.debug("Voto: " + dataS);
					res.json(dataS);
				}
			});
		}
	});
};

module.exports.comentar = function(req, res){
	votaciones.findById(req.body.idVotacion)
	.exec(function(err, data){
		if(err){
			winston.error("Error: " + err);
		}
		else{
			data.comentarios.push({
				idUsuario: req.body.idUsuario,
				comentario: req.body.comentario,
				fechaAlta: req.body.fechaAlta
			});
			
			data.save(function(errS, dataS){
				winston.debug("Comentarios: " + dataS.comentarios);
				res.json(dataS.comentarios);
			});
		}
	});
};

module.exports.notifVotaciones = function(req, res){
	votaciones.find({$and: [{consorcio: req.params.idConsorcio}, {fechaFin: {$gte: new Date()}}, {'votos.codigoUnidad': {$ne: req.params.codigoUnidad}}]})
	.count()
	.exec(function(err, data){
		if(err){
			winston.error("Error: " + err);
		}
		else{
			winston.debug("Mis votos pendientes: " + data);

			res.json(data);
		}
	});
};

/******************* SERVICIO REST PARA NOTIFICACIONES! =) *******************/
/*--GCM--*/
var sender = new gcm.Sender('AIzaSyBt4m5EB46eF9z68aJdGQVv3nxyeo-twIU');
/*--GCM--*/

function sendNotification(message, title, gcmIds, consorcio, codigo, votacion){
	winston.debug("Enviando mensaje: " + message);
	winston.debug("Titulo: " + title);
	winston.debug("Consorcio Id: " + consorcio);
	winston.debug("Codigo Consorcio: " + codigo);
	winston.debug("Votacion Id: " + votacion);
	winston.debug("gcmIds: " + gcmIds);
	
	var message_aux = new gcm.Message({
		delayWhileIdle: true,
	    timeToLive: 3600,
	    data: {
	    	message: message,
			title: title,
			msgcnt: 1,
			idConsorcio: consorcio,
			codigoConsorcio: codigo,
			idVotacion: votacion,
			tipo: 'Votacion'
	    }
	});
	
	/**
	 * Parameters: message-literal, registrationIds-array, No. of retries, callback-function
	 */
	sender.send(message_aux, gcmIds, 4, function (error, data) {
		if(error){
			winston.error("Error: " + error);
		}
		else{
			winston.debug("Resultado Mensaje: " + JSON.stringify(data));			
		}
	});
};

function sendNotificationByCondominium(condominiums, idVotacion, message, title, mongooseModel){
	var gcmIds = [];
		
		for(var i = 0; i < condominiums.length; i++){
			mongooseModel.findById(condominiums[i])
			.select('pisos lotes codigo')
			.populate([{path: 'pisos.deptos.propietarios.idUsuario'}, {path: 'lotes.propietarios.idUsuario'}])
			.exec(function(err, data){
				if(err){
					winston.error("Error: " + err);
				}
				else{
					if(data.pisos != ''){
						data.pisos.forEach(function(piso, posP){
							piso.deptos.forEach(function(dpto, posDpto){
								dpto.propietarios.forEach(function(prop, posProp){
									gcmIds.push(prop.idUsuario.gcmId);
								});
							});
						});
					}
					else{
						data.lotes.forEach(function(lote, posL){
							lote.propietarios.forEach(function(prop, posProp){
								gcmIds.push(prop.idUsuario.gcmId);
							});
						});
					}
				}
				
				sendNotification(message, title, gcmIds, data._id, data.codigo, idVotacion);
			});
		}
};
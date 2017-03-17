var mongoose 		= require('mongoose');
var winston			= require('winston');
var ObjectId 		= mongoose.Schema.Types.ObjectId;
var consorcioEntity = mongoose.model('consorcios');
var fs				= require("fs");

var conversacionSchema = mongoose.Schema({
	avistantes: [{
		idUsuario:{
			type: ObjectId,
			ref: 'usuarios'
		},
		noLeidos: Number
	}],
	participantes: Array,
	cantidadParticipantes: Number,
	ultimoMensaje: {
		type: ObjectId,
		ref: 'mensajes'
	},
	fechaAlta: Date,
	fechaBaja: Date,
	fechaUpdate: Date
});


var conversacion = mongoose.model('conversaciones', conversacionSchema);


/******************* SERVICIO REST PARA CONSULTAS DE APLICACION WEB! =) *******************/


module.exports.verificarConversacion = function(req, res){
	var usuarios = req.params.participantes.split(',');

	conversacion.find({$and:
		[
			{participantes: { $in: usuarios}},
			{cantidadParticipantes: usuarios.length}
		]})
	.exec(function(err, data){
		if(err)
		{
			winston.error("Error: " + err);
		}
		else
		{
			var respuesta = [];
			var repetidos = 0 ;
			for (var x = 0; x < data.length; x++)
			{
				repetidos = 0;
				for (var i = 0; i < data[x].participantes.length; i++) 
				{
					for (var j = 0; j < usuarios.length; j++) 
					{
						if (usuarios[j] == data[x].participantes[i])
						{
							repetidos++;
						}
					}
				}
				if (data[x].participantes.length == repetidos)
				{
					respuesta.push(data[x]);
				}
			}
			res.json(respuesta);
		}
	})
};

module.exports.crearConversacion = function(req, res){
	var avistantes = [];
	for(var i = 0; i < req.body.participantes.length; i++)
	{
		if (req.body.participantes[i] == req.body.usuarioRemitente)
		{
			var noLeidos = 0;
		}
		else
		{
			var noLeidos = 1;
		}
		avistantes.push({
				idUsuario: req.body.participantes[i],
				noLeidos: noLeidos
		})
	}

	var nuevaConversacion = new conversacion({
		avistantes: avistantes,
		participantes: req.body.participantes,
		cantidadParticipantes: req.body.participantes.length,
		fechaAlta: new Date(),
		fechaBaja: '',
		fechaUpdate: new Date()
	})

	nuevaConversacion.save(function(err, data){
		if(err){
			winston.error("Error: " + err);
		}
		else{
			winston.debug("Conversacion creada " + data);
			res.json(data);
		}
	});
};

module.exports.actualizarConversacion = function(req, res){
	conversacion.findById(req.body.idConversacion)
	.exec(function(err, data){
		if(err){
			winston.error("Error: " + err);
		}
		else{
			if (req.body.idUsuario != undefined)
			{
				for (var i = 0; i < data.avistantes.length; i++) 
				{
					if(data.avistantes[i].idUsuario == req.body.idUsuario) //Nuestro no leido pasa a cero /Ver y Responder/
					{
						data.avistantes[i].noLeidos = 0;
					}
					else if(req.body.idUltimoMensaje != undefined) //Aumentamos el no leido del resto /Responder/
					{
						data.avistantes[i].noLeidos += 1;
					}
				}
			}
			if(req.body.idUltimoMensaje != undefined)
			{
				data.ultimoMensaje = req.body.idUltimoMensaje;
				data.fechaUpdate = new Date();
			}
			data.save(function(err, dataC){
				res.json(dataC);
			})
		}
	})

};


module.exports.obtenerConversaciones = function(req, res){
	if(req.params.idConsorcio == 0)
	{
		conversacion.find({participantes: {$in: [req.params.idUsuario]}})
		.populate([{path: 'ultimoMensaje', select: '-adjuntoMensaje'},{path: 'avistantes.idUsuario'}])
		.sort({fechaUpdate: -1})
		.lean()
		.exec(function(err, data){
			if(err)
			{
				winston.error("Error: " + err);
			}
			else
			{
				res.json(data);
			}
		})
	}
	else
	{		
	    consorcioEntity.findById(req.params.idConsorcio)
	    .select("-imagen")
//	    .populate({path: 'pisos.deptos.propietarios.idUsuario', select: 'pisos.deptos.propietarios'})
	    .lean()
	    .exec(function(err, data){
	        if(err){
	            winston.error("Error: " + err);
	        }
	        else{
	        	var usuarios = [];
	        	
	        	data.pisos.forEach(function(piso, posP){
	                piso.deptos.forEach(function(dpto, posDpto){
	                    dpto.propietarios.forEach(function(prop, posProp){
	                        usuarios.push(prop.idUsuario.toString());
	                    });
	                });
	            });
	        	
	        	data.lotes.forEach(function(piso, posP){
	        		piso.propietarios.forEach(function(prop, posProp){
                        usuarios.push(prop.idUsuario.toString());
                    });
	            });
	        	
	        	conversacion.find({$and: [
	        	                    	  { participantes: {$in: [req.params.idUsuario]} }, 
	                                      { participantes: {$in: usuarios} }
        	                    	  	]
        	    })
				.populate([{path: 'ultimoMensaje', select: '-adjuntoMensaje'},{path: 'avistantes.idUsuario'}])
				.sort({fechaUpdate: -1})
				.exec(function(err, dataC){
					if(err)
					{
						winston.error("Error: " + err);
					}
					else
					{
						res.json(dataC);
					}
				})
	        }
	    });
	}
};

module.exports.notifMensajes = function(req, res){
    conversacion.find()
    .select('avistantes')
    .exec(function(err, data){
        if(err){
            winston.error("Error: " + err);
        }
        else{
            var notificaciones = 0;

			if(data != '' || data[0] != undefined || data.length != 0 || data[0] != null){
				for(var i = 0; i < data.length; i++){
					for(var j = 0; j < data[i].avistantes.length; j++){
						if(data[i].avistantes[j].idUsuario == req.params.idUsuario){
							notificaciones += data[i].avistantes[j].noLeidos;
						}
					}
				}
			}
			
			winston.debug("Mis notificaciones: " + notificaciones);
			res.json(notificaciones);
        }
    });
};

module.exports.countNoLeidosByConversacion = function(req, res){
	conversacion.findById(req.params.idConversacion)
	.select('avistantes')
	.lean()
	.exec(function(error, data){
		if(error){
			winston.error("Error: " + error);
		}
		else{
			var noLeidos = 0;

			for(var x = 0; x < data.avistantes.length; x++){
				if(data.avistantes[x].noLeidos > 0){
					noLeidos = data.avistantes[x].noLeidos;
				}
			}

			res.json(noLeidos);
		}
	});
};
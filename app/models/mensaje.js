//Definicion del modelo de un usuario!
var mongoose 		= require('mongoose');
var winston			= require('winston');
var consorcioEntity = mongoose.model('consorcios');
var usuarioEntity   = mongoose.model('usuarios');
var ObjectId 		= mongoose.Schema.Types.ObjectId;
var fs				= require("fs");
var gcm 			= require('node-gcm');

/*--GCM--*/
var sender = new gcm.Sender('AIzaSyBt4m5EB46eF9z68aJdGQVv3nxyeo-twIU');
/*--GCM--*/

var mensajeSchema = mongoose.Schema({
	tipo: String,
	usuarioRemitente : {
		type: ObjectId,
		ref: 'usuarios'
	},
	usuariosDestinatarios : [{
		type: ObjectId,
		ref: 'usuarios'
	}],
	idConversacion: {
		type: ObjectId,
		ref: 'conversaciones'
	},
	mensaje: String,
	adjuntoMensaje: {
        type: mongoose.Schema.Types.ObjectId,
        ref:'archivos'
    },
    consorcioDireccion: String,
	piso: String,
	dpto: String,
	lote: String,
	tieneImg: Boolean,
	fechaAlta: Date,
	fechaBaja: Date
});


var mensaje = mongoose.model('mensajes', mensajeSchema);

/******************* SERVICIO REST PARA CONSULTAS DE APLICACION WEB! =) *******************/
module.exports.obtenerAdjuntoByMensajeId = function(req,res){
	mensaje.findById(req.params.id)
	.lean()
	.exec(function(error, data){
		if(error){
			res.send(err);
		}
		else{
			var img;
			
			if(data.adjuntoMensaje != undefined || data.adjuntoMensaje != ''){
				img = new Buffer(data.adjuntoMensaje.data, 'binary').toString('base64');
	
			    res.writeHead(200, {
			      'Content-Type': data.adjuntoMensaje.type,
			      'Content-Disposition': 'attachment'
			    });
	   
	   			res.end(img); 
			}
			else{
				res.send("");
			}
		}
	});
};

module.exports.obtenerMensajePorDestinatario = function(req, res) {
	mensaje.find({ usuariosDestinatarios: req.params.idDestinatario }).sort({ fechaAlta: -1 })
    .populate('usuarioRemitente')
    .populate('usuariosDestinatarios')
    .select('-adjuntoMensaje')
    .lean()
    .exec(function(error, mensajes) {
        if (error)
            res.send(err);

        winston.debug(JSON.stringify(mensajes, null, "\t"))
        res.json(mensajes);
    });
};

module.exports.obtenerMensajesByAdmin = function(req, res) {
    mensaje.find({$or: [{usuariosDestinatarios: {$in: [req.params.idAdministrador]}}, {usuarioRemitente: {$in: [req.params.idAdministrador]}}]})
    .sort({ fechaAlta: -1 })
    .populate('usuarioRemitente')
    .populate('usuariosDestinatarios')
    .select('-adjuntoMensaje')
    .lean()
    .exec(function(error, mensajes) {
        if (error){
            res.send(err);
		}
        res.json(mensajes);
    });
};

module.exports.obtenerMensajesPorIdConsorcio = function(req, res) {
	var idAdministrador;
	
    consorcioEntity.findById(req.params.idConsorcio)
    .populate({path: 'pisos.deptos.propietarios.idUsuario', select: 'pisos.deptos.propietarios'})
    .select('-adjuntoMensaje')
    .lean()
    .exec(function(err, data){
        if(err){
            winston.error("Error: " + err);
        }
        else{
        	idAdministrador = data.administrador;
        	var usuarios = [];
        	
        	data.pisos.forEach(function(piso, posP){
                piso.deptos.forEach(function(dpto, posDpto){
                    dpto.propietarios.forEach(function(prop, posProp){
                        usuarios.push(prop.idUsuario._id);
                    });
                });
            });
            
        	mensaje.find({$or: 
        				   [{ 
        	                      $and: [
	        	                    	  { usuarioRemitente: { "$in": [idAdministrador]} }, 
	                                      { usuariosDestinatarios: { "$in": usuarios} }
        	                    	  	]
        				    },
                    	  	{ $and: [ 
        	                          { usuarioRemitente: { "$in": usuarios} }, 
                                      { usuariosDestinatarios: { "$in": [idAdministrador]} }
                      		        ]
						    }
						   ]}
        	)
        	.sort({ fechaAlta: -1 })
        	.select('-adjuntoMensaje')
            .populate('usuarioRemitente')
            .populate('usuariosDestinatarios')
            .exec(function(error, mensajes) {
                if (error){
                    res.send(err);
                }
                else{
	                winston.debug(JSON.stringify(mensajes, null, "\t"))
	                res.json(mensajes);
                }
            });
        }
    });
};

module.exports.obtenerMensajesAll = function(req, res) {
	mensaje.find({}).sort({ fechaAlta: -1 })
	.select('-adjuntoMensaje')
    .populate('usuarioRemitente')
    .populate('usuariosDestinatarios')
    .lean()
    .exec(function(error, mensajes) {
        if (error)
            res.send(err);

        winston.debug(JSON.stringify(mensajes, null, "\t"))
        res.json(mensajes);
    });
};

/******************* SERVICIO REST PARA CONSULTAS DE APLICACION MOBILE! =) *******************/
module.exports.obtenerConversacion = function(req, res){
	mensaje.find({idConversacion: req.params.idConversacion})
	.count()
	.exec(function(errorC, totalMensajes){
		mensaje.find({idConversacion: req.params.idConversacion})
		.populate([{path: 'usuariosDestinatarios'}, {path: 'usuarioRemitente'}])
		.sort({fechaAlta: 1})
		.skip(totalMensajes > 30 ? totalMensajes - 30 : 0)
		.exec(function(error, data){
			if(error){
				winston.error("Error: " + error);
			}
			else{
				winston.debug("Conversacion: " + data);
			
				res.json({
					totalMensajes: totalMensajes,
					mensajes: data
				});
//				res.json(data);
			}
		});
	});	
};

module.exports.obtenerHistorial = function(req, res){
	//Obtengo el total de mensajes
	mensaje.find({idConversacion: req.params.idConversacion})
	.count()
	.exec(function(errorC, totalMensajes){
		//Tomo todos los anteriores del total de mensajes menos los 30 que el usuario está viendo
		mensaje.find({idConversacion: req.params.idConversacion})
		.limit(totalMensajes - req.params.skip)
		.count()
		.exec(function(errorL, totalMensajesL){
			//Tomo los 30 anteriores a los que esta viendo el usuario
			mensaje.find({idConversacion: req.params.idConversacion})
			.populate([{path: 'usuariosDestinatarios'}, {path: 'usuarioRemitente'}])
			.sort({fechaAlta: 1})
			.limit(totalMensajesL)
			.exec(function(errorM, dataM){
				winston.debug("Mensajes: " + dataM);

				res.json({
					count: totalMensajesL,
					mensajes: (dataM.slice(-30)).reverse()
				});
			});
		});
	});
};

module.exports.crearMensaje = function(req, res) {
    var mensaje_aux = new mensaje({
        usuarioRemitente: req.body.usuarioRemitente,
        usuariosDestinatarios: req.body.usuariosDestinatarios,
        mensaje: req.body.mensaje,
        idConversacion: req.body.idConversacion,
        fechaAlta: new Date(),
        fechaBaja: '',
        tieneImg: req.body.tieneImg,
        adjuntoMensaje: req.body.adjuntoMensaje,
    	consorcioDireccion: req.body.consorcioDireccion,
    	piso: req.body.piso,
    	dpto: req.body.dpto,
    	lote: req.body.lote
    });
    
    mensaje_aux.save(function(err, data){
        if(err){
            winston.error("Error: " + err);
        }
        else{
			var host = req.get('host');
			if (host.substring(0, 9) != 'localhost')
			{
				sendNotificationByUser(data.usuariosDestinatarios, data.idConversacion, '¡Has recibido un nuevo mensaje!', 'Mensaje', req.body.usuarioRemitente, usuarioEntity);
			}
        	
            res.json(data);
        }
    });
};

module.exports.obtenerMensajesNuevos = function(req, res){
	mensaje.find({$and: [{idConversacion: req.params.idConversacion}, {fechaAlta: {$gt: req.params.fechaUltimoMensaje}}, {usuarioRemitente: {$ne: req.params.idUsuario}}]})
	.populate([{path: 'usuariosDestinatarios'}, {path: 'usuarioRemitente'}])
	.sort({fechaAlta: 1})
	.exec(function(error, data){
		if(error){
			winston.error("Error: " + error);
		}
		else{
			winston.debug("Mensajes Nuevos: " + data);
			
			res.json(data);
		}
	});
};

/******************* SERVICIO REST PARA NOTIFICACIONES! =) *******************/
function sendNotification(message, title, gcmIds, conversacion){
	winston.debug("Enviando mensaje: " + message);
	winston.debug("Titulo: " + title);
	winston.debug("Conversacion Id: " + conversacion);
	winston.debug("gcmIds: " + gcmIds);
	
	var message_aux = new gcm.Message({
		delayWhileIdle: true,
	    timeToLive: 3600,
	    data: {
	    	message: message,
	    	msgcnt: 1,
			title: title,
			idConversacion: conversacion,
			tipo: 'Mensaje'
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

function sendNotificationByUser(idUsers, idConversacion, message, title, idRemitente, mongooseModel){
	for(var i = 0; i < idUsers.length; i++){
		mongooseModel.findById(idUsers[i])
		.select('gcmId esAdministrador')
		.exec(function(err, data){
			if(err){
				winston.error("Error: " + err);
			}
			else{
				if(!data.esAdministrador && data._id != idRemitente){
					sendNotification(message, title, data.gcmId, idConversacion);
				}
			}
		});
	}
};
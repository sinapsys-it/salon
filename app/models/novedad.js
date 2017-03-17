//Definicion del modelo de un usuario!
var mongoose 		= require('mongoose');
var winston			= require('winston');
var consorcioEntity = mongoose.model('consorcios');
var gcm 			= require('node-gcm');

/*--GCM--*/
var sender = new gcm.Sender('AIzaSyBt4m5EB46eF9z68aJdGQVv3nxyeo-twIU');
/*--GCM--*/

var novedadSchema = mongoose.Schema({
	usuarioRemitente: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'usuarios'
	},
	consorcios: [{
					type: mongoose.Schema.Types.ObjectId,
					ref:'consorcios'
				}],
	leido: Boolean,
	asunto: String,
	mensaje: String,
	adjuntoNovedad: [{
        type: mongoose.Schema.Types.ObjectId,
        ref:'archivos'
    }],
    tieneImg: Boolean,
	fechaAlta: Date,
	fechaBaja: Date
});
var novedad = mongoose.model('novedades', novedadSchema);

/******************* SERVICIO REST PARA CONSULTAS DE APLICACION WEB! =) *******************/

module.exports.obtenerNovedadesAll = function(req, res) {
	novedad.find({})
    .populate('consorcios', 'direccion codigo')
    .exec(function(err, novedades) {
        if (err)
            res.send(err);
        res.json(novedades);
    });
};

module.exports.obtenerNovedadesByAdmin = function(req, res){
	consorcioEntity.find({ administrador: req.params.idAdministrador})	.select('_id')
	.exec(function(error, consorcios){
		novedad.find({ consorcios: { "$in" : consorcios } }).sort({ fechaAlta: -1 })
		.or([{fechaBaja : ''},{fechaBaja: { $gt: new Date()}}])
		.populate({
		  path: 'consorcios',
		  match: { administrador: req.params.idAdministrador },
		  select: 'direccion codigo'
		})
	    .exec(function(err, novedades) {
	        if (err){
	            res.send(err);
	        }
	        else{
	        	res.json(novedades); 
	        }
	    });
	});
};

module.exports.obtenerNovedadByConsorcioId = function(req, res) {
	novedad.find({ consorcios: { "$in" : [req.params.id]} }).sort({ fechaAlta: -1 })
	.or([{fechaBaja : ''},{fechaBaja: { $gt: new Date()}}])
    .populate('consorcios', 'direccion')
    .exec(function(err, novedades) {
        if (err){
            res.send(err);
        }
        else{
        	res.json(novedades);
        }
    });
};

module.exports.crear = function(req, res) {
    var novedad_aux = new novedad({
        usuarioRemitente: req.body.novedad.usuarioRemitente,
        consorcios: req.body.novedad.consorcios,
        asunto: req.body.novedad.asunto,
        mensaje: req.body.novedad.mensaje,
        adjuntoNovedad: req.body.novedad.adjuntoNovedad,
		tieneImg: req.body.novedad.tieneImg,
        leido: false,
        fechaAlta: new Date(),
        fechaBaja: ''
    });
    
    novedad_aux.save(function(err,data){
        if(err){
            winston.error("Error: " + err);
        }
        else{
            winston.debug("Novedad: " + data);

			var host = req.get('host');
			if (host.substring(0, 9) != 'localhost')
			{
   		    	sendNotificationByCondominium(data.consorcios, data._id, 'Has recibido una nueva novedad!', 'Novedad', consorcioEntity);
   		    }
   		    
            res.json(data);
        }
    });
};

module.exports.eliminar = function (req, res){
    return novedad.findById(req.params.id, function (err, novedad_aux) {

        novedad_aux.fechaBaja = new Date();

        return novedad_aux.save(function (err, data) {
            if (!err)
            {
                winston.debug("novedad dada de baja");
                res.json(data);
            }
            else 
            {
                winston.error(err);
            }
        });
    });
};

module.exports.obtenerFiltroAniosByAdmin = function(req,res){
	var ddlAnios = [];
    novedad.find({ usuarioRemitente: req.params.idAdministrador })
    .or([{fechaBaja : ''},{fechaBaja: { $gt: new Date()}}])
	.sort({periodo:-1})
	.exec(function(err, ultimo){
		if(ultimo != undefined && ultimo != ''){
			var fechaFinal = ultimo[0].fechaAlta.getFullYear();
			novedad.find({ usuarioRemitente: req.params.idAdministrador })
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
};
/******************* SERVICIO REST PARA CONSULTAS DE APLICACION MOBILE! =) *******************/
module.exports.obtenerNovedades = function(req, res){
	var anioActual = new Date().getFullYear();
	var anioProximo = new Date().getFullYear() + 1;

	novedad.find({$and: [{consorcios: {$in: [req.params.idConsorcio]}}, {fechaAlta: {$lt: new Date(anioProximo, '01', '01')}}, {fechaAlta: {$gt: new Date(anioActual, '01', '01')}}]})
	.or([{fechaBaja : ''}, {fechaBaja: { $gt: new Date()}}])
	.populate([{path: 'usuarioRemitente'}, {path: 'consorcios', select: '-imagen'}])
	.sort({leido: 1, fechaAlta: -1})
	.exec(function(err, data){
		if(err){
			winston.error("Error: " + err);
		}
		else{
			winston.debug("Mis novedades: " + data);
			res.json(data);
		}
	});
};

module.exports.obtenerNovedad = function(req, res){
	novedad.findById(req.params.idNovedad)
	.exec(function(err, data){
		if(err){
			winston.error("Error: " + err);
		}
		else{
			data.leido = true;

			data.save(function(error, novedad){
				winston.debug("Novedad detalle: " + novedad);
				res.json(novedad);
			});
		}
	});
};

module.exports.notifNovedades = function(req, res){
	var anioActual = new Date().getFullYear();
	var anioProximo = new Date().getFullYear() + 1;

	novedad.find({$and: [{consorcios: {$in: [req.params.idConsorcio]}}, {fechaAlta: {$lt: new Date(anioProximo, '01', '01')}}, {fechaAlta: {$gt: new Date(anioActual, '01', '01')}}]})
	.or([{fechaBaja : ''}, {fechaBaja: { $gt: new Date()}}])
	.count({leido: false})
	.exec(function(err, data){
		if(err){
			winston.error("Error: " + err);
		}
		else{
			winston.debug("Mis novedades: " + data);
			return res.json(data);
		}
	});
};

/******************* SERVICIO REST PARA NOTIFICACIONES! =) *******************/
function sendNotification(message, title, gcmIds, consorcio, codigo, novedad){
	winston.debug("Enviando mensaje: " + message);
	winston.debug("Titulo: " + title);
	winston.debug("Consorcio Id: " + consorcio);
	winston.debug("Codigo Consorcio: " + codigo);
	winston.debug("Novedad Id: " + novedad);
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
			idNovedad: novedad,
			tipo: 'Novedad'
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

function sendNotificationByCondominium(condominiums, idNovedad, message, title, mongooseModel){
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

				sendNotification(message, title, gcmIds, data._id, data.codigo, idNovedad);
			});
		}
};

function sendNotificationByUser(idUsers, message, title, mongooseModel){
	for(var i = 0; i < idUsers.length; i++){
		mongooseModel.findById(idUsers[i])
		.select('gcmId esAdministrador')
		.exec(function(err, data){
			if(err){
				winston.error("Error: " + err);
			}
			else{
				if(!data.esAdministrador){
					sendNotification(message, title, data.gcmId);						
				}
			}
		});
	}
};
//Definicion del modelo de un edificio!
//Nota: cada piso de un edificio tendra un Schema de pisos, el cual tiene un array de Schema de departamentos y su numero de piso
var mongoose = require('mongoose');
var winston			= require('winston');
var fs				= require("fs");
var archivosEntity = mongoose.model('archivos');
var generator = require('./codegenerator');
var SHA256 = require("crypto-js/sha256");

var consorcioSchema = new mongoose.Schema({
	codigo: String,
	direccion: String,
	administrador: {
		type: mongoose.Schema.Types.ObjectId,
		ref:'usuarios'
	},
	formaspago: [{
		type: mongoose.Schema.Types.ObjectId,
		ref:'formaspagos'
	}],
	tipo: String,
	pisos: [{numero: String,
		deptos:[{
			nombre: String
			, codigo: String
			, propietarios: [{
					idUsuario: {
							type: mongoose.Schema.Types.ObjectId,
							ref:'usuarios'
					},
					tipo: String
				}]
			}]
		}],
	lotes: [{numero: String,
			codigo: String,
			propietarios: [{
				idUsuario: {
					type: mongoose.Schema.Types.ObjectId,
					ref:'usuarios'
				},
				tipo: String
			}]
		}],
    imagen: {
        type: mongoose.Schema.Types.ObjectId,
        ref:'archivos'
    },
	fechaAlta: Date,
	fechaBaja: Date
});


var consorcio = mongoose.model('consorcios', consorcioSchema);

/******************* SERVICIO REST PARA CONSULTAS DE APLICACION WEB! =) *******************/
module.exports.verificarAddress = function(req, res){
		//Find for an exact match using "^" and "$". The search is case-insensitive beacause "$options: i"
		consorcio.find( {$and:[
	   					{"direccion": { "$regex": "^" + req.params.direccion + "$", "$options": "i" }},
						{"administrador": req.params.idAdministrador} 
		]})
		.exec(function(err, consorcios) {
	        if (err){
	            res.send(err);
	        }
	        else if(consorcios != undefined && consorcios != ''){
	        	res.json(false);
	        }
	        else{
	        	res.json(true);
	        }
    });
}

module.exports.obtenerConsorcioImagenById =  function(req, res) {       
	consorcio
	.findById(req.params.id)
	.exec(function(err, data) {
		 if (err) {
	            res.send(err);
	        }
	        
	        var imagen;
	        
	        if(data.imagen.data != undefined){
		        var datos = new Buffer(data.imagen.data).toString('base64');
		        var contentType = data.imagen.contentType;
		        var imagen = 'data:' + contentType + ';base64,' + datos;
	        }
	        else{
	        	imagen = "";
	        }
	        
	        res.json(imagen);
	});
};

module.exports.obtenerConsorcioByFormaPago =  function(req, res) {       
	consorcio
	.find({formaspago: {$in: [req.params.idFormaPago]}})
	.select('fechaAlta')
	.exec(function(err, data) {
		  if (err)
	            res.send(err);
	    		
    	res.json(data);
	});
};

module.exports.obtenerConsorcios =  function(req, res) {       
	consorcio
	.find()
	.select('-imagen')
	.populate({path: 'formaspago', select: 'nombre'})
	.sort({direccion: 1})
	.exec(function(err, consorcios) {
	    // if there is an error retrieving, send the error. 
	    // nothing after res.send(err) will execute
	    if (err)
	        res.send(err);
	
	    res.json(consorcios); // return all heroes in JSON format
	});
};

module.exports.obtenerDetalleConsorcioById = function(req, res){
	consorcio
	.findById(req.params.id)
	.select('pisos lotes')
	.lean()
	.exec(function(err, consorcios) {
	    if (err)
	        res.send(err);
	
	    res.json(consorcios);
	});
}

module.exports.obtenerConsorciosByAdmin =  function(req, res) {       
	consorcio
	.find({ administrador: req.params.idAdministrador})
	.select('-pisos -lotes')
	.populate({path: 'formaspago'})
	.sort({direccion: 1})
	.lean()
	.exec(function(err, consorcios) {
	    if (err)
	        res.send(err);
	
	    res.json(consorcios);
	});
};

module.exports.obtenerDdlConsorciosByAdmin = function(req, res) {
    consorcio
    .find({ administrador: req.params.id })
    .sort({'direccion': 1})
    .select('direccion')
	.exec(function(err, consorcios) {
        if (err){
            res.send(err);
        }
        
        res.json(consorcios); // return all heroes in JSON format
    });
};

module.exports.obtenerDdlConsorcios = function(req, res) {
    consorcio
    .find({})
    .select('_id direccion')
	.exec(function(err, consorcios) {

        // if there is an error retrieving, send the error. 
                        // nothing after res.send(err) will execute
        if (err)
            res.send(err);

        res.json(consorcios); // return all heroes in JSON format
    });
};

module.exports.obtenerConsorcioByQuery = function(req,res){
	consorcio
	.find({ 
		"direccion": { "$regex": req.params.qDireccion, "$options": "i" } 
	})
	.select('_id direccion')
	.exec(function(err, consorcios) {
        if (err)
            res.send(err);
    		
    	res.json(consorcios);
    });
};

module.exports.obtenerConsorciosByQueryAndAdmin = function(req,res){
	consorcio
	.find({$and:[
					{"direccion": { "$regex": req.params.qDireccion, "$options": "i" }},
					{"administrador": req.params.idAdministrador} 
	]})
	.select('_id direccion')
	.exec(function(err, consorcios) {
        if (err)
            res.send(err);
    		
    	res.json(consorcios);
    });
};

module.exports.obtenerConsorcioById = function (req, res){
  consorcio.findById(req.params.id)
  .select('-pisos -lotes')
  .populate({path: 'formaspago'})
  .lean()
  .exec(function (err, data) {
	if (!err) {
		
	  res.send(data);
	  
	} else {
	  winston.error("Error obteniendo consorcios: " + err);
	}
  });
}

function nuevoCodigoConsorcio (cb){
	function LoTieneUnCondominio(condominios, code){
		if(condominios.filter(function(c){return c.codigo == code;}).length > 0){
			return true;
		}

		return false;
	}

	consorcio
	.find({}, function(err, data) {
    	var code = (Math.random() * 15).toString(16).split('.')[1].substring(0, 5).toUpperCase();

		while(LoTieneUnCondominio(data, code)){
			code = (Math.random() * (15 - 0) + 0).toString(16).split('.')[1].substring(0, 5).toUpperCase();
		}
		cb(code);
    });
};
    
module.exports.esCodigoUnico = function(req, res){
	return consorcio
	.findOne({ 'codigo': req.params.codigo })
	.select('-imagen')
	.exec(function (err, data) {
        if (!err){
            if(data != null){
                return res.send(false);
            }
            else{
                return  res.send(true);
            }

        } else {
            return res.send(err);
        }
    });
};

module.exports.subirImagen = function(req, res) {
	return consorcio.findById(req.params.id, function (err, consorcio_aux) {
		if(req.files.file != undefined){
			winston.debug("Recibi esta imagen!");
			winston.debug(req.files.file.path);
	    	consorcio_aux.imagen = 
			{	
				data: fs.readFileSync(req.files.file.path), 
				contentType: req.files.file.type
			}
	    }
    
	    consorcio_aux.save(function (err) {
	      if (!err) {
	        /*winston.debug("El consorcio ha sido actualizado!");
	        winston.debug(JSON.stringify(consorcio_aux));*/
	      } else {
	        winston.error(err);
	      }
	      return res.send(consorcio_aux);
	    });
  });
}

module.exports.crear = function(req, res) {
	nuevoCodigoConsorcio(function(nuevoCodigo){
		function LoTieneUnDepto(pisos, code){
			for(var p=0; p < pisos.length; p++){
				if(pisos[p].deptos.filter(function(e){return e.codigo == code;}).length > 0){
					return true;
					break;
				}
			}
			return false;
		}

		function LoTieneUnLote(lotes, code){
			if(lotes.filter(function(l){return l.codigo == code;}).length > 0){
				return true;
			}
			return false;
		}

		function GenerarCodigoDeptos(pisos, cb){
			for(var p=0; p < pisos.length; p++){
				for(var d=0; d < pisos[p].deptos[d].length; d++){
					var code = (Math.random() * (15 - 0) + 0).split('.')[1].substring(0, 3).toUpperCase();

					while(LoTieneUnDepto(pisos, code)){
						code = (Math.random() * (15 - 0) + 0).split('.')[1].substring(0, 3).toUpperCase();
					}

					pisos[p].deptos[d].codigo = code;
				}
			}

			cb(pisos);
		}

		function GenerarCodigoLotes(lotes, cb){
			var aux_lotes = [];

			for(var l=1; l <= lotes; l++) {
				var code = (Math.random() * 15).toString(16).split('.')[1].substring(0, 3).toUpperCase();

				while (LoTieneUnLote(aux_lotes, code)) {
					code = (Math.random() * 15).toString(16).split('.')[1].substring(0, 3).toUpperCase();
				}

				aux_lotes.push({ numero: l, codigo: code });
			}

			cb(aux_lotes);
		}

		var consorcio_aux = new consorcio({
			imagen: req.body.consorcio.imagen,
			codigo: nuevoCodigo,
			administrador: req.body.consorcio.administrador,
			direccion: req.body.consorcio.direccion,
			formaspago: req.body.consorcio.formaspago,
			tipo: req.body.consorcio.tipo,
			pisos: [],
			lotes: [],
			fechaAlta: new Date(),
			fechaBaja: ''
		});

		if(req.body.consorcio.pisos.length > 0){
			GenerarCodigoDeptos(req.body.consorcio.pisos, function(pisos){
				consorcio_aux.pisos = pisos;
			});
        }
        else{
        	GenerarCodigoLotes(req.body.consorcio.lotes, function(lotes){
				consorcio_aux.lotes = lotes;
			});
        }


		
	    
		consorcio_aux.save(function(err,data){
	        if(err){
	            winston.error("Error: " + err);
	        }
	        else{
	            winston.debug("Consorcio: " + data);
	            res.json(data);
	        }
		});
	});
};

module.exports.eliminar = function(req, res) {
    consorcio.remove({
    	_id: req.params.consorcio
    }, function(err, data){
        if(err){
            res.send(err);
        }
        consorcio.find(function(err, consorcios){
            if(err){
        		res.send(err);
            }
            res.json(consorcios);
        });
    });
};

module.exports.editarImagen = function (req, res){
    return consorcio.findById(req.params.id, function (err, consorcio_aux) {
        
    	consorcio_aux.imagen = req.body.imagen;
    
    return consorcio_aux.save(function (err) {
      if (!err) {
        winston.debug("El consorcio ha sido actualizado!");
        winston.debug(JSON.stringify(consorcio_aux));
      } else {
        winston.error(err);
      }
      return res.send(consorcio_aux);
    });
  });
};

module.exports.editar = function (req, res){
    return consorcio.findById(req.params.id, function (err, consorcio_aux) {
        
        if (consorcio_aux.imagen != req.body.consorcio.imagen)
        {
        	archivosEntity.remove({
				_id: consorcio_aux.imagen
			}, function(err, data){
				if(err){
					res.send(err);
				}
			});
        }

    	consorcio_aux.codigo     			= req.body.consorcio.codigo;
    	consorcio_aux.direccion  			= req.body.consorcio.direccion;
    	consorcio_aux.formaspago 			= req.body.consorcio.formaspago;
    	consorcio_aux.tipo      			= req.body.consorcio.tipo;
    	consorcio_aux.imagen				= req.body.consorcio.imagen;
    	consorcio_aux.imgUrl     			= req.body.consorcio.imgUrl;
    	
    	if(req.body.consorcio.pisos || req.body.consorcio.lote){
    		consorcio_aux.pisos      			= req.body.consorcio.pisos;
    		consorcio_aux.lotes       			= req.body.consorcio.lotes;
    	}
    
    return consorcio_aux.save(function (err) {
      if (!err) {
        winston.debug("El consorcio ha sido actualizado!");
        winston.debug(JSON.stringify(consorcio_aux));
      } else {
        winston.error(err);
      }
      return res.send(consorcio_aux);
    });
  });
};

/******************* SERVICIO REST PARA CONSULTAS DE APLICACION MOBILE! =) *******************/
module.exports.verificarConsorcio = function(req, res){
	winston.debug(req.query.codigos);
	consorcio.find({
		codigo: req.query.codigos.split(',')[0]
	})
	.populate([{path: 'pisos.deptos.propietarios.idUsuario', select: 'uuid'}, {path: 'lotes.propietarios.idUsuario', select: 'uuid'}])
	.select('-imagen')
	.exec(function(err, dataC){
		if(err){
			winston.error("Error: " + err);
		}
		else{
			if(dataC[0] != "" && dataC.length != 0 && dataC[0] != undefined){
				if(dataC[0].pisos != ""){
					consorcio.find({'pisos.deptos.codigo': req.query.codigos.split(',')[1]})
					.select('-imagen')
					.exec(function(err, data){
						if(err){
							winston.error("Error: " + err);
						}
						else{
							winston.debug("Consorcio: " + data);
							var existe = false;

							for(var piso = 0; piso < dataC[0].pisos.length; piso++){
								for(var dpto = 0; dpto < dataC[0].pisos[piso].deptos.length; dpto++){
									if(dataC[0].pisos[piso].deptos[dpto].codigo == req.query.codigos.split(',')[1]){
										for(var prop = 0; prop < dataC[0].pisos[piso].deptos[dpto].propietarios.length; prop++){
											if(dataC[0].pisos[piso].deptos[dpto].propietarios[prop].idUsuario.uuid == req.query.uuid){
												existe = true;
											}
										}
									}
								}
							}
							
							if(!existe){
								res.json(data);
							}
							else{
								res.json(existe);
							}
						}
					});
				}
				else{
					consorcio.find({'lotes.codigo': req.query.codigos.split(',')[1]})
					.select('-imagen')
					.exec(function(err, data){
						if(err){
							winston.error("Error: " + err);
						}
						else{
							winston.debug("Consorcio: " + data);
							var existe = false;
							
							for(var lote = 0; lote < dataC[0].lotes.length; lote++){
								if(dataC[0].lotes[lote].codigo == req.query.codigos.split(',')[1]){
									for(var prop = 0; prop < dataC[0].lotes[lote].propietarios.length; prop++){
										if(dataC[0].lotes[lote].propietarios[prop].idUsuario.uuid == req.query.uuid){
											existe = true;
										}
									}
								}
							}
							
							if(!existe){
								res.json(data);
							}
							else{
								res.json(existe);
							}
						}
					});
				}
			}
			else{
				res.json(dataC);
			}
		}
	});
};

module.exports.verificarConsorcioWeb = function(req, res){
	winston.debug(req.params.codigos);
	winston.debug(req.params.idUsuario);
	consorcio.find({
		codigo: req.params.codigos.split(',')[0]
	})
	.populate([{path: 'pisos.deptos.propietarios.idUsuario', select: '_id'}, {path: 'lotes.propietarios.idUsuario', select: '_id'}])
	.select('-imagen')
	.exec(function(err, dataC){
		if(err){
			winston.error("Error: " + err);
		}
		else{
			if(dataC[0] != "" && dataC.length != 0 && dataC[0] != undefined){
				if(dataC[0].pisos != ""){
					consorcio.find({'pisos.deptos.codigo': req.params.codigos.split(',')[1]})
					.select('-imagen')
					.exec(function(err, data){
						if(err){
							winston.error("Error: " + err);
						}
						else{
							winston.debug("Consorcio: " + data);
							var existe = false;

							for(var piso = 0; piso < dataC[0].pisos.length; piso++){
								for(var dpto = 0; dpto < dataC[0].pisos[piso].deptos.length; dpto++){
									if(dataC[0].pisos[piso].deptos[dpto].codigo == req.params.codigos.split(',')[1]){
										for(var prop = 0; prop < dataC[0].pisos[piso].deptos[dpto].propietarios.length; prop++){
											if(dataC[0].pisos[piso].deptos[dpto].propietarios[prop].idUsuario._id == req.params.idUsuario){
												existe = true;
											}
										}
									}
								}
							}
							
							if(!existe){
								res.json(data);
							}
							else{
								res.json(existe);
							}
						}
					});
				}
				else{
					consorcio.find({'lotes.codigo': req.params.codigos.split(',')[1]})
					.select('-imagen')
					.exec(function(err, data){
						if(err){
							winston.error("Error: " + err);
						}
						else{
							winston.debug("Consorcio: " + data);
							var existe = false;
							
							for(var lote = 0; lote < dataC[0].lotes.length; lote++){
								if(dataC[0].lotes[lote].codigo == req.params.codigos.split(',')[1]){
									for(var prop = 0; prop < dataC[0].lotes[lote].propietarios.length; prop++){
										if(dataC[0].lotes[lote].propietarios[prop].idUsuario._id == req.params.idUsuario){
											existe = true;
										}
									}
								}
							}
							
							if(!existe){
								res.json(data);
							}
							else{
								res.json(existe);
							}
						}
					});
				}
			}
			else{
				res.json(dataC);
			}
		}
	});
};

module.exports.obtenerConsorcio = function(req, res){
	consorcio.find({
		codigo: req.query.codigoConsorcio
	})
	.exec(function(err, data){
		if(err){
			winston.error("Error: " + err);
		}
		else{
			winston.debug("Consorcio: " + data);
			res.json(data);
		}
	});
};

module.exports.obtenerMisConsorcios = function(req, res){
	consorcio.find({
		'$or': [{'pisos.deptos.propietarios.idUsuario': req.query.idUsuario}, {'lotes.propietarios.idUsuario': req.query.idUsuario}]
	})
	.populate({path: 'administrador', select: 'nombreApellido _id'})
	.exec(function(err, data){
		if(err){
			winston.error("Error: " + err);
		}
		else{
			winston.debug("Mis consorcios: " + data);
			res.json(data);
		}
	});
};

module.exports.obtenerMisContactos = function(req, res){	
	consorcio.find({codigo: req.query.codigoConsorcio})
	.select('administrador pisos.deptos.propietarios.idUsuario lotes.propietarios.idUsuario lotes.numero pisos.numero pisos.deptos')
	.populate('pisos.deptos.propietarios.idUsuario')
	.populate('lotes.propietarios.idUsuario')
	.populate('administrador')
	.exec(function(err, data){
		if(err){
			winston.error("Error: " + err);
		}
		else{
			var usuarios = [];

			usuarios.push(data[0].administrador);

			if(data[0].pisos != ''){
				data.forEach(function(doc, posD){
					doc.pisos.forEach(function(piso, posP){
						piso.deptos.forEach(function(dpto, posDpto){
							dpto.propietarios.forEach(function(prop, posProp){
								if(prop.idUsuario._id != req.query.idUsuario){
									var usuario_aux = {
										_id: prop.idUsuario._id,
										nombreApellido: prop.idUsuario.nombreApellido,
										unidadFunc: piso.numero == 0 ? 'Local - ' + dpto.nombre : (piso.numero == 1 ? 'Piso: PB' : 'Piso: ' + (parseInt(piso.numero) - 1) + ' - Dpto: ' + dpto.nombre)
									};

									usuarios.push(usuario_aux);
								}
							});
						});
					});
				});
			}
			else{
				data.forEach(function(doc, posD){
					doc.lotes.forEach(function(lote, posL){
						lote.propietarios.forEach(function(prop, posProp){
							if(prop.idUsuario._id != req.query.idUsuario){
								var usuario_aux = {
									_id: prop.idUsuario._id,
									nombreApellido: prop.idUsuario.nombreApellido,
									lote: lote.numero
								};

								usuarios.push(usuario_aux);
							}
						});
					});
				});
			}

			res.json(usuarios);
		}
	});
};

module.exports.localStorage = function(req, res){
	consorcio.find()
	.populate([{path: 'pisos.deptos.propietarios.idUsuario'}, {path: 'lotes.propietarios.idUsuario'}])
	.exec(function(err, data){
		if(err){
			winston.error("Error: " + err);
		}
		else{
			var usuariosEntity = mongoose.model('usuarios');

			generator.generarPassword(usuariosEntity, function(password){
				var datos = {
					_idUsuario: '',
					usuarioExiste: 'true',
					codigoConsorcio: '',
					_idConsorcio: '',
					NombreApellidoUsuario: '',
					codigos: '',
					piso: '',
					dpto: '',
					loteNumero: '',
					contrasenia: ''
				};

				var datosVacios = true;

				for(var consorcio = 0; consorcio < data.length; consorcio++){
					if(data[consorcio].pisos.length != 0){
						if(datosVacios){
							for(var piso = 0; piso < data[consorcio].pisos.length; piso++){
								for(var dpto = 0; dpto < data[consorcio].pisos[piso].deptos.length; dpto++){
									for(var prop = 0; prop < data[consorcio].pisos[piso].deptos[dpto].propietarios.length; prop++){
										if(data[consorcio].pisos[piso].deptos[dpto].propietarios[prop].idUsuario.uuid == req.params.uuid){
											datos._idUsuario = data[consorcio].pisos[piso].deptos[dpto].propietarios[prop].idUsuario._id;
											datos.codigoConsorcio = data[consorcio].codigo;
											datos._idConsorcio = data[consorcio]._id;
											datos.NombreApellidoUsuario = data[consorcio].pisos[piso].deptos[dpto].propietarios[prop].idUsuario.nombreApellido;
											datos.codigos = data[consorcio].codigo + data[consorcio].pisos[piso].deptos[dpto].codigo;
											datos.piso = data[consorcio].pisos[piso].numero;
											datos.dpto = data[consorcio].pisos[piso].deptos[dpto].nombre;
											datos.loteNumero = null;
											datos.contrasenia = password;

											usuariosEntity.findById(data[consorcio].pisos[piso].deptos[dpto].propietarios[prop].idUsuario._id)
											.exec(function(e, u){
												u.contrasenia = SHA256(password);
												u.save();
											});
											
											datosVacios = false;
										}
									}
								}
							}
						}
					}
					else{
						if(datosVacios){
							for(var lote = 0; lote < data[consorcio].lotes.length; lote++){
								for(var prop = 0; prop < data[consorcio].lotes[lote].propietarios.length; prop++){
									if(data[consorcio].lotes[lote].propietarios[prop].idUsuario.uuid == req.params.uuid){
										datos._idUsuario = data[consorcio].lotes[lote].propietarios[prop].idUsuario._id;
										datos.codigoConsorcio = data[consorcio].codigo;
										datos._idConsorcio = data[consorcio]._id;
										datos.NombreApellidoUsuario = data[consorcio].lotes[lote].propietarios[prop].idUsuario.nombreApellido;
										datos.codigos = data[consorcio].codigo + data[consorcio].lotes[lote].codigo;
										datos.piso = null;
										datos.dpto = null;
										datos.loteNumero = data[consorcio].codigo + data[consorcio].lotes[lote].numero;
										datos.contrasenia = password;

										usuariosEntity.findById(data[consorcio].lotes[lote].propietarios[prop].idUsuario._id)
										.exec(function(e, u){
											u.contrasenia = SHA256(password);
											u.save();
										});
										
										datosVacios = false;
									}
								}
							}
						}
					}
				}

				res.json(datos);
			});
		}
	});
};

module.exports.obtenerContactosByQuery = function(req, res){
	consorcio.find({$and: 
		[
			{
				codigo: req.params.codigoConsorcio
			},
			{
				$or: 
				[ 
                 	{ 'pisos.deptos.propietarios': {$not: {$size: 0}}},
                 	{ 'lotes.propietarios': {$not: {$size: 0}}}
                ]
            }
        ]
	})
	.populate(
	{
		path: 'pisos.deptos.propietarios.idUsuario',
		match: {nombreApellido: { "$regex": req.params.qNombreUsuario, "$options": "i" } },
		select: 'nombreApellido _id'
	})
	.populate(
	{
		path: 'lotes.propietarios.idUsuario',
		match: {nombreApellido: { "$regex": req.params.qNombreUsuario, "$options": "i" } },
		select: 'nombreApellido _id'
	})
	.select('pisos lotes codigo direccion')
	.exec(function(err,consorcios){
		var usuarios = [];	
		var repetido = '';
		
		for(var c = 0; c < consorcios.length; c++){
			for(var p = 0; p < consorcios[c].pisos.length; p++){
				for(var d = 0; d < consorcios[c].pisos[p].deptos.length; d++){
					for(var u = 0; u < consorcios[c].pisos[p].deptos[d].propietarios.length; u++){
						// ¬¬
						if (consorcios[c].pisos[p].deptos[d].propietarios[u].idUsuario != undefined && consorcios[c].pisos[p].deptos[d].propietarios[u].idUsuario != null){
							repetido = false;

							for (var i = 0; i < usuarios.length; i++) {
								if(usuarios[i]._id.equals(consorcios[c].pisos[p].deptos[d].propietarios[u].idUsuario._id)){
									repetido = true;
								}
							}							

							if (!repetido && consorcios[c].pisos[p].deptos[d].propietarios[u].idUsuario._id != req.params.idUsuario){
								var usuarioViewModel = {
									_id: consorcios[c].pisos[p].deptos[d].propietarios[u].idUsuario._id,
									nombreApellido: consorcios[c].pisos[p].deptos[d].propietarios[u].idUsuario.nombreApellido
								};

								usuarios.push(usuarioViewModel);
							}
						}
					}
				}
			}
			for(var l = 0; l < consorcios[c].lotes.length; l++){
				for(var u = 0; u < consorcios[c].lotes[l].propietarios.length; u++){
					// ¬¬
					if (consorcios[c].lotes[l].propietarios[u].idUsuario != undefined && consorcios[c].lotes[l].propietarios[u].idUsuario != null){
						var repetido = false;

						for (var i = 0; i < usuarios.length; i++) {
							if(usuarios[i]._id.equals(consorcios[c].lotes[l].propietarios[u].idUsuario._id)){
								repetido = true;
							}
						}

						if (!repetido && consorcios[c].lotes[l].propietarios[u].idUsuario._id != req.params.idUsuario){
							var usuarioViewModel = {
								_id: consorcios[c].lotes[l].propietarios[u].idUsuario._id,
								nombreApellido: consorcios[c].lotes[l].propietarios[u].idUsuario.nombreApellido
							};

							usuarios.push(usuarioViewModel);
						}
					}
				}
			}
		}

		res.json(usuarios);
	});
};

module.exports.formasPagos = function(req, res){
	consorcio.findById(req.params.idConsorcio)
	.select('formaspago')
	.populate('formaspago')
	.lean()
	.exec(function(err, data){
		if (err){
			winston.error("Error: " + err);
		}
		else{
			winston.debug("Formas de pago: " + data);
			res.json(data);
		}
	});
};
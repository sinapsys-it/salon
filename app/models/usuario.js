//Definicion del modelo de un usuario!
var mongoose = require('mongoose');
var winston			= require('winston');
var consorcioEntity = mongoose.model('consorcios');
var generator = require('./codegenerator');
var SHA256          = require('crypto-js/sha256');

var usuarioSchema = mongoose.Schema({
	razonSocial: String,
	esPersonaFisica: Boolean,
	cuil: String,
	cuit: String,
	location: {
		latitude: String,
		longitude: String,
		placeId: String
	},
	domicilio: {
		calle: String,
		altura: String,
		piso: String,
		dto: String,
		localidad: String,
		codigoPostal: String,
		provincia: String,
		pais: String
	},
	esAdministrador: Boolean,
	nombreApellido: String,
	nombre: String,
	apellido: String,
	contrasenia: String,
	mail: String,
	telefono: {
		codigoPais: String,
		area: String,
		numero: String
	},
	celular: String,
	activo: Boolean,
	uuid: String,
	gcmId: String,
	recibeNotif: Boolean,
	fechaAlta: Date,
	fechaBaja: Date
});
var usuario = mongoose.model('usuarios', usuarioSchema);

/******************* SERVICIO REST PARA CONSULTAS DE APLICACION WEB! =) *******************/
module.exports.verificarEmail = function(req,res){
	usuario.find( { mail: req.params.mail } ,function(err, usuarios) {
        if (err){
            res.send(err);
        }
        else if(usuarios != undefined && usuarios != ''){
        	res.json(false);
        }
        else{
        	res.json(true);
        }
    });
};

module.exports.obtenerUsuarioById = function(req, res) {
	usuario.find( { _id: { $ne: req.params.idRemitente } } ,function(err, usuarios) {
        // if there is an error retrieving, send the error. 
        // nothing after res.send(err) will execute
        if (err)
            res.send(err);

        res.json(usuarios); // return all heroes in JSON format
    });
};

module.exports.obtenerPropietarios = function(req, res) {
	consorcioEntity.find({ $or: [ 
	                             	{ 'pisos.deptos.propietarios': {$not: {$size: 0}}},
	                             	{ 'lotes.propietarios': {$not: {$size: 0}}}
	                             ]
		})
	  	.populate('pisos.deptos.propietarios.idUsuario')
	  	.populate('lotes.propietarios.idUsuario')
	  	.select('pisos lotes codigo direccion')
	  	.exec(function(err,consorcios){
	  		var usuarios = [];
	  			  		
	  		for(var c = 0; c < consorcios.length; c++){
				for(var p = 0; p < consorcios[c].pisos.length; p++){
					for(var d=0; d < consorcios[c].pisos[p].deptos.length; d++){
						for(var u=0; u < consorcios[c].pisos[p].deptos[d].propietarios.length; u++){
							// ¬¬
							var usuarioViewModel = {
								consorcio: {
  									codigo: consorcios[c].codigo,
  									direccion: consorcios[c].direccion
  								},
  								tipo: consorcios[c].pisos[p].deptos[d].propietarios[u].tipo,
								nombreApellido: consorcios[c].pisos[p].deptos[d].propietarios[u].idUsuario.nombreApellido,
								mail: consorcios[c].pisos[p].deptos[d].propietarios[u].idUsuario.mail,
								telefono: consorcios[c].pisos[p].deptos[d].propietarios[u].idUsuario.telefono,
								estado: 'Activo',
								piso: consorcios[c].pisos[p].numero,
								depto: consorcios[c].pisos[p].deptos[d].nombre
							};
							
							usuarios.push(usuarioViewModel);
						}
					}
				}
				for(var l = 0; l < consorcios[c].lotes.length; l++){
					for(var u=0; u < consorcios[c].lotes[l].propietarios.length; u++){
						// ¬¬
						var usuarioViewModel = {
							consorcio: {
  								codigo: consorcios[c].codigo,
  								direccion: consorcios[c].direccion
  							},
							tipo: consorcios[c].lotes[l].propietarios[u].tipo,
							nombreApellido: consorcios[c].lotes[l].propietarios[u].idUsuario.nombreApellido,
							mail: consorcios[c].lotes[l].propietarios[u].idUsuario.mail,
							telefono: consorcios[c].lotes[l].propietarios[u].idUsuario.telefono,
							estado: 'Activo',
							piso: '',
							depto: '',
							lote: consorcios[c].lotes[l].numero,
						};
						
						usuarios.push(usuarioViewModel);
					}
				}
			}
	  		res.json(usuarios);
	  	});
};


module.exports.obtenerPropietariosByAdmin = function(req, res) {
	consorcioEntity.find({$and: [{ administrador: req.params.idAdministrador},
								{ $or: [ 
								 	{ 
								 		$and: [ 
								 			{'pisos': { $exists: true, $ne: [] } }, 
								 			/*{'pisos.$.deptos': { $exists: true, $ne: [] } },
								 			{'pisos.$.deptos.$.propietarios': {$ne: []}}*/
							 			]
							 		},
							 		{ 	
						 				$and: [ 
						 					{'lotes': { $exists: true, $ne: [] }},  
						 					//{'lotes.$.propietarios': { $ne: [] }}
					 					]
					 				}]
					 			}
		]})
		.populate({
		    path: 'pisos.deptos.propietarios.idUsuario'
		  , select: 'nombreApellido _id mail telefono celular activo uuid' 
		})
		.populate({
		    path: 'lotes.propietarios.idUsuario'
		  , select: 'nombreApellido _id mail telefono celular activo uuid' 
		})
	  	.sort({ 'direccion': 1})
	  	.lean()
	  	.exec(function(err,consorcios){
	  		if(err)
  				res.json(err);

	  		var usuarios = [];
	  			  		
	  		for(var c = 0; c < consorcios.length; c++){
				for(var p = 0; p < consorcios[c].pisos.length; p++){
					for(var d=0; d < consorcios[c].pisos[p].deptos.length; d++){
						for(var u=0; u < consorcios[c].pisos[p].deptos[d].propietarios.length; u++){
							// ¬¬
							if(consorcios[c].pisos[p].deptos[d].propietarios[u].idUsuario != null){
								var usuarioViewModel = {
									consorcio: {
	  									codigo: consorcios[c].codigo,
	  									direccion: consorcios[c].direccion
	  								},
	  								id: consorcios[c].pisos[p].deptos[d].propietarios[u].idUsuario._id,
	  								tipo: consorcios[c].pisos[p].deptos[d].propietarios[u].tipo,
	  								activo: consorcios[c].pisos[p].deptos[d].propietarios[u].idUsuario.activo,
									nombreApellido: consorcios[c].pisos[p].deptos[d].propietarios[u].idUsuario.nombreApellido,
									mail: consorcios[c].pisos[p].deptos[d].propietarios[u].idUsuario.mail,
									telefono: consorcios[c].pisos[p].deptos[d].propietarios[u].idUsuario.telefono,
									celular: consorcios[c].pisos[p].deptos[d].propietarios[u].idUsuario.celular,
									piso: consorcios[c].pisos[p].numero,
									depto: consorcios[c].pisos[p].deptos[d].nombre,
									uuid: consorcios[c].pisos[p].deptos[d].propietarios[u].idUsuario.uuid
								};
								usuarios.push(usuarioViewModel);
							}
						}
					}
				}
				for(var l = 0; l < consorcios[c].lotes.length; l++){
					for(var u=0; u < consorcios[c].lotes[l].propietarios.length; u++){
						if(consorcios[c].lotes[l].propietarios[u].idUsuario != null){
							var usuarioViewModel = {
								consorcio: {
	  								codigo: consorcios[c].codigo,
	  								direccion: consorcios[c].direccion
	  							},
	  							id: consorcios[c].lotes[l].propietarios[u].idUsuario._id,
	  							tipo: consorcios[c].lotes[l].propietarios[u].tipo,
	  							activo: consorcios[c].lotes[l].propietarios[u].idUsuario.activo,
								nombreApellido: consorcios[c].lotes[l].propietarios[u].idUsuario.nombreApellido,
								mail: consorcios[c].lotes[l].propietarios[u].idUsuario.mail,
								telefono: consorcios[c].lotes[l].propietarios[u].idUsuario.telefono,
								celular: consorcios[c].lotes[l].propietarios[u].idUsuario.celular,
								piso: '',
								depto: '',
								lote: consorcios[c].lotes[l].numero,
								uuid: consorcios[c].lotes[l].propietarios[u].idUsuario.uuid
							};
							usuarios.push(usuarioViewModel);
						}
					}
					
				}
			}

	  		res.json(usuarios);
	  	});
};
module.exports.obtenerPropietariosAndCByQueryAndAdmin = function(req, res) {
	consorcioEntity.find({$and: 
		[
			{ 
				administrador: req.params.idAdministrador
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
	}
	)
	.populate(
	{
		path: 'lotes.propietarios.idUsuario',
		match: {nombreApellido: { "$regex": req.params.qNombreUsuario, "$options": "i" } },
		select: 'nombreApellido _id'
	}
	)
	.select('pisos lotes codigo direccion')
	.lean()
	.exec(function(err,consorcios){
		var usuarios = [];	
		var repetido = '';
		
		for(var c = 0; c < consorcios.length; c++){
			for(var p = 0; p < consorcios[c].pisos.length; p++){
				for(var d=0; d < consorcios[c].pisos[p].deptos.length; d++){
					for(var u=0; u < consorcios[c].pisos[p].deptos[d].propietarios.length; u++){
						// ¬¬
						if (consorcios[c].pisos[p].deptos[d].propietarios[u].idUsuario != undefined && consorcios[c].pisos[p].deptos[d].propietarios[u].idUsuario != null)
						{
							repetido = false;
							for (var i = 0; i < usuarios.length; i++) 
							{
								winston.debug(usuarios);
								if(usuarios[i]._id.equals(consorcios[c].pisos[p].deptos[d].propietarios[u].idUsuario._id))
									repetido = true;
							}							
							if (!repetido)
							{
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
				for(var u=0; u < consorcios[c].lotes[l].propietarios.length; u++){
					// ¬¬
					if (consorcios[c].lotes[l].propietarios[u].idUsuario != undefined && consorcios[c].lotes[l].propietarios[u].idUsuario != null)
					{
						var repetido = false;
						for (var i = 0; i < usuarios.length; i++) 
						{
							if(usuarios[i]._id.equals(consorcios[c].lotes[l].propietarios[u].idUsuario._id))
								repetido = true;
						}			
						if (!repetido)
						{
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
		
		consorcioEntity.find({$and: [{ direccion: { "$regex": req.params.qNombreUsuario, "$options": "i" }}, { administrador: req.params.idAdministrador }]})
		.select('codigo direccion')
		.exec(function(err, consorcios){
			for(var c =  0; c < consorcios.length; c++){
				var consorcioViewModel = {
						_id: consorcios[c]._id,
						nombreApellido: consorcios[c].direccion,
						esConsorcio: true
				};
				
				usuarios.push(consorcioViewModel);
			}
			
			res.json(usuarios);
		});
	});
};


module.exports.obtenerPropietariosByQueryAndAdmin = function(req, res) {
	consorcioEntity.find({$and: 
						[
							{ 
								administrador: req.params.idAdministrador
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
	  		}
	  	)
	  	.populate(
	  		{
	  			path: 'lotes.propietarios.idUsuario',
	  			match: {nombreApellido: { "$regex": req.params.qNombreUsuario, "$options": "i" } },
	  			select: 'nombreApellido _id'
	  		}
	  	)
	  	.select('pisos lotes codigo direccion')
	  	.exec(function(err,consorcios){
	  		var usuarios = [];	
	  		var repetido = '';
	  		for(var c = 0; c < consorcios.length; c++){
				for(var p = 0; p < consorcios[c].pisos.length; p++){
					for(var d=0; d < consorcios[c].pisos[p].deptos.length; d++){
						for(var u=0; u < consorcios[c].pisos[p].deptos[d].propietarios.length; u++){
							// ¬¬
							if (consorcios[c].pisos[p].deptos[d].propietarios[u].idUsuario != undefined && consorcios[c].pisos[p].deptos[d].propietarios[u].idUsuario != null)
							{
								repetido = false;
								for (var i = 0; i < usuarios.length; i++) 
								{
									winston.debug(usuarios);
									if(usuarios[i]._id.equals(consorcios[c].pisos[p].deptos[d].propietarios[u].idUsuario._id))
										repetido = true;
								}							
								if (!repetido)
								{
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
					for(var u=0; u < consorcios[c].lotes[l].propietarios.length; u++){
						// ¬¬
						if (consorcios[c].lotes[l].propietarios[u].idUsuario != undefined && consorcios[c].lotes[l].propietarios[u].idUsuario != null)
						{
							var repetido = false;
							for (var i = 0; i < usuarios.length; i++) 
							{
								if(usuarios[i]._id.equals(consorcios[c].lotes[l].propietarios[u].idUsuario._id))
									repetido = true;
							}			
							if (!repetido)
							{
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


module.exports.obtenerUsuariosAll = function(req, res) {
	usuario.find(function(err, usuarios) {
        // if there is an error retrieving, send the error. 
        // nothing after res.send(err) will execute
        if (err)
            res.send(err);

        res.json(usuarios); // return all heroes in JSON format
    });
};

module.exports.crear = function(req, res) {
    var usuario_aux = new usuario({
    	razonSocial: req.body.usuario.razonSocial,
    	esPersonaFisica: req.body.usuario.esPersonaFisica,
    	cuil: req.body.usuario.cuil,
    	cuit: req.body.usuario.cuit,
    	location: {
    		latitude: req.body.usuario.location.latitude,
    		longitude: req.body.usuario.location.longitude,
    		placeId: req.body.usuario.location.placeId
    	},
    	domicilio: {
    		calle: req.body.usuario.domicilio.calle,
    		altura: req.body.usuario.domicilio.altura,
    		localidad: req.body.usuario.domicilio.localidad,
    		codigoPostal: req.body.usuario.domicilio.codigoPostal,
    		provincia: req.body.usuario.domicilio.provincia,
    		pais: req.body.usuario.domicilio.pais,
    		piso: req.body.usuario.domicilio.piso,
    		dto: req.body.usuario.domicilio.dto
    	},
    	nombreApellido: req.body.usuario.nombre + " " + req.body.usuario.apellido,
    	nombre: req.body.usuario.nombre,
    	apellido: req.body.usuario.apellido,
    	contrasenia: req.body.usuario.contrasenia,
    	mail: req.body.usuario.mail,
    	telefono: {
    		codigoPais: req.body.usuario.telefono.codigoPais,
    		area: req.body.usuario.telefono.area,
    		numero: req.body.usuario.telefono.numero
    	},
    	esAdministrador: true,
        fechaAlta: new Date(),
        fechaBaja: ' '
    });
    
    usuario_aux.save(function(err,data){
        if(err){
            winston.error("Error: " + err);
        }
        else{
            winston.debug("Consorcio: " + data);
            res.json(data);
        }
    });
};

module.exports.obtenerUsuarioByMail = function(req, res){
	usuario.findOne({$and:[{ mail: req.query.username}, {contrasenia: req.query.password }, {esAdministrador: true}]}, function (err, data) {
		if (err){
		    res.send(err);
		}
		else{
		    res.json(data);
		}
	});
};

module.exports.obtenerPropInqByMail = function(req, res){
	console.log(req.query.password);
	usuario.findOne({$and:[{ mail: req.query.username}, {contrasenia: req.query.password }, {esAdministrador: false}]}, function (err, data) {
		if (err){
		    res.send(err);
		}
		else{
		    res.json(data);
		}
	});
};

module.exports.obtenerPropietariosByConsorcioId = function(req, res){
	consorcioEntity.find(
	{ $and: [
				 {$or: [ 
	                 { 'pisos.deptos.propietarios': {$not: {$size: 0}}},
	                 { 'lotes.propietarios': {$not: {$size: 0}}}
	                 ]
				}
				,{ _id: req.params.id}
	]})
	.populate('pisos.deptos.propietarios.idUsuario')
	.populate('lotes.propietarios.idUsuario')
	.select('pisos lotes codigo direccion')
	.exec(function(err,consorcios){		
		var usuarios = [];
		for(var c = 0; c < consorcios.length; c++){
			for(var p = 0; p < consorcios[c].pisos.length; p++){
				for(var d=0; d < consorcios[c].pisos[p].deptos.length; d++){
					for(var u=0; u < consorcios[c].pisos[p].deptos[d].propietarios.length; u++){
						// ¬¬
						var usuarioViewModel = {
							consorcio: {
  									codigo: consorcios[c].codigo,
  									direccion: consorcios[c].direccion
  								},
							id: consorcios[c].pisos[p].deptos[d].propietarios[u].idUsuario._id,
							tipo: consorcios[c].pisos[p].deptos[d].propietarios[u].tipo,
							activo: consorcios[c].pisos[p].deptos[d].propietarios[u].idUsuario.activo,
							nombreApellido: consorcios[c].pisos[p].deptos[d].propietarios[u].idUsuario.nombreApellido,
							mail: consorcios[c].pisos[p].deptos[d].propietarios[u].idUsuario.mail,
							telefono: consorcios[c].pisos[p].deptos[d].propietarios[u].idUsuario.telefono,
							celular: consorcios[c].pisos[p].deptos[d].propietarios[u].idUsuario.celular,
							piso: consorcios[c].pisos[p].numero,
							depto: consorcios[c].pisos[p].deptos[d].nombre
						};
						
						usuarios.push(usuarioViewModel);
					}
				}
			}
			for(var l = 0; l < consorcios[c].lotes.length; l++){
				for(var u=0; u < consorcios[c].lotes[l].propietarios.length; u++){
					// ¬¬
					var usuarioViewModel = {
						consorcio: {
  									codigo: consorcios[c].codigo,
  									direccion: consorcios[c].direccion
  								},
						id: consorcios[c].lotes[l].propietarios[u].idUsuario._id,
						tipo: consorcios[c].lotes[l].propietarios[u].tipo,
						activo: consorcios[c].lotes[l].propietarios[u].idUsuario.activo,
						nombreApellido: consorcios[c].lotes[l].propietarios[u].idUsuario.nombreApellido,
						mail: consorcios[c].lotes[l].propietarios[u].idUsuario.mail,
						telefono: consorcios[c].lotes[l].propietarios[u].idUsuario.telefono,
						celular: consorcios[c].lotes[l].propietarios[u].idUsuario.celular,
						piso: '',
						depto: '',
						lote: consorcios[c].lotes[l].numero,
					};
					
					usuarios.push(usuarioViewModel);
				}
			}
		}
		res.json(usuarios);
	});
};

module.exports.obtenerUsuarioByConsorcioId = function(req, res){
    consorcioEntity.find({_id: req.params.id})
    .populate({path: 'pisos.deptos.propietarios.idUsuario', select: 'pisos.deptos.propietarios'})
    .exec(function(err, data){
        if(err){
            winston.error("Error: " + err);
        }
        else{
            var usuarios = new Array();
            data.forEach(function(doc, posD){
                doc.pisos.forEach(function(piso, posP){
                    piso.deptos.forEach(function(dpto, posDpto){
                        dpto.propietarios.forEach(function(prop, posProp){
                            if(prop._id != req.body.idUsuario){
                                usuarios.push(prop.idUsuario);
                            }
                        });
                    });
                });
                doc.lotes.forEach(function(lotes, posL){
                    lotes.propietarios.forEach(function(prop, posProp){
                        if (prop._id != req.body.idUsuario){
                            usuarios.push(prop.idUsuario);
                        }
                    });
                });
            });

            usuario.find({ _id: { $in : usuarios } }).sort({ fechaAlta: -1 })
            .exec(function(error, usuarios) {
                if (error)
                    res.send(err);

                res.json(usuarios);
            });
        }
    });
};

module.exports.obtenerUsuarioByQuery = function(req,res){
	usuario
	.find({ 
		"nombreApellido": { "$regex": req.params.qNombreUsuario, "$options": "i" } 
	})
	.select('_id nombreApellido')
	.exec(function(err, usuarios) {
        if (err)
            res.send(err);
    		
    	res.json(usuarios);
    });
};

module.exports.obtenerUsuarioByQueryAndUsuarios = function(req,res){
	usuario
	.find({$and:
		[
			{ 
				'nombreApellido': { "$regex": req.params.qNombreUsuario, "$options": "i" }
			}, 
			{ 
				'nombreApellido': { "$in" : req.params.usuarios }
			}
		]
	})
	.select('_id nombreApellido')
	.exec(function(err, usuarios) {
        if (err)
            res.send(err);
    		
    	res.json(usuarios);
    });
};

module.exports.obtenerDdlUsuarios = function(req, res) {
	usuario
    .find({})
    .select('_id nombreApellido')
	.exec(function(err, usuarios) {
        if (err)
            res.send(err);

        res.json(usuarios); 
    });
};



module.exports.eliminar = function(req, res){
	
	function getRandomInt(min, max) {
	  return Math.floor(Math.random() * (max - min)) + min;
	}
	
	function existeCodigo(unidades, nuevoCodigo){
		for(var u=0; u < unidades.length; u++){
			if(unidades[u].codigo == nuevoCodigo){
				return true;
			}
		}
		
		return false;
	}
	
	usuario.findById(req.params.id, function (err, oldUser) {
		if (!err) {
			consorcioEntity.find({$and: [{ codigo: req.params.codigoConsorcio }, { administrador: req.params.idAdministrador }]})
			.exec(function(err, consorcios){
				var consorcio = consorcios[0];
				var nuevoCodigo = '';
				var got2 = false;
				var lote_index = 0;
				var pisos_index = 0;
				var prop_index= 0;
				var depto_index =0 ;
				
				if(consorcio.lotes.length){//Vive en un lote (?)
					for(lote_index = 0; lote_index < consorcio.lotes.length; lote_index++){
						for(prop_index=0; prop_index < consorcio.lotes[lote_index].propietarios.length; prop_index++){
							if(consorcio.lotes[lote_index].propietarios[prop_index].idUsuario.toString() == oldUser._id.toString()){
								nuevoCodigo = getRandomInt(100, 999).toString('16').toUpperCase();
								
								while(existeCodigo(consorcio.lotes, nuevoCodigo)){
									nuevoCodigo = getRandomInt(100, 999).toString('16').toUpperCase();
								}
								
								got2 = true;
								break;
							}
						}
						if(got2){
							break;
						}
					}
					consorcio.lotes[lote_index].codigo = nuevoCodigo;
					consorcio.lotes[lote_index].propietarios.splice(prop_index, 1);
				}
				else{//Vive en un edificio
					for(pisos_index = 0; pisos_index < consorcio.pisos.length; pisos_index++){
						for(depto_index=0; depto_index < consorcio.pisos[pisos_index].deptos.length; depto_index++){
							for(prop_index=0; prop_index < consorcio.pisos[pisos_index].deptos[depto_index].propietarios.length; prop_index++){
								if(consorcio.pisos[pisos_index].deptos[depto_index].propietarios[prop_index].idUsuario.toString() == oldUser._id.toString()){
									nuevoCodigo = getRandomInt(100, 999).toString('16').toUpperCase();
									
									var deptos = [];
									
									for(var d=0; d < consorcio.pisos.length; d++){
										deptos = deptos.concat(consorcio.pisos[d].deptos);
									}
									
									while(existeCodigo(deptos, nuevoCodigo)){
										nuevoCodigo = getRandomInt(100, 999).toString('16').toUpperCase();
									}
									
									got2 = true;
									break;
								}
							}
							if(got2){
								break;
							}
						}
						if(got2){
							break;
						}
					}
					
					consorcio.pisos[pisos_index].deptos[depto_index].codigo = nuevoCodigo;
					consorcio.pisos[pisos_index].deptos[depto_index].propietarios.splice(prop_index, 1);
				}
				
				consorcio.save(function (err) {
				      if (!err) {
				        winston.debug("El consorcio ha sido actualizado!");
				        winston.debug(JSON.stringify(consorcio));
				      } else {
				        winston.error(err);
				      }
				      	res.send(consorcio);
			    });
			});
		} 
		else {
		  winston.error(err);
		}
	});
};

module.exports.cambiarEstado = function(req, res){
	usuario.findById(req.params.id, function (err, usuario) {
		var estadoActual = usuario.activo;
		usuario.activo = !estadoActual;
		
		usuario.save(function (err, data) {
			if (!err) {
			  winston.debug("usuario updated");
			  res.json(data);
			} 
			else {
			  winston.error(err);
			}
		});
	});
};

/******************* SERVICIO REST PARA CONSULTAS DE APLICACION MOBILE! =) *******************/
module.exports.obtenerUsuario = function(req, res){
	usuario.findOne({
		uuid: req.query.uuid
	}, function(err, data){
		if(err){
			winston.error("Error: " + err);
		}
		else{
			winston.debug("Usuario: " + data);
			res.json(data);
		}
	});
};

module.exports.registrarUsuario = function(req, res){
	if(req.body.usuarioExiste == 'true'){
		winston.debug("Actualizando dpto...");

		consorcioEntity.findOne({codigo: req.body.datos.codigo}, function(er, doc){
			if(doc.pisos != ''){
				doc.pisos.forEach(function(piso, posP){
					piso.deptos.forEach(function(dpto, posD){
						if(dpto.codigo == req.body.datos.codigoDptoLote){							
							var propietario = {idUsuario: req.body.datos._id, tipo: req.body.datos.descripcion};
							
							dpto.propietarios.push(propietario);
							doc.save();
							
							res.json(req.body.datos);
						}
					});
				});
			}
			else{
				doc.lotes.forEach(function(lote, posL){
					if(lote.codigo == req.body.datos.codigoDptoLote){
						var propietario = {idUsuario: req.body.datos._id, tipo: req.body.datos.descripcion};
    					
    					lote.propietarios.push(propietario);
    					doc.save();
						
						res.json(req.body.datos);
					}
				});
			}
		});
	}
	else{
		winston.debug("Insertando usuario...");

		generator.generarPassword(usuario, function(password){
			var usuarioNuevo = new usuario({
				nombreApellido: req.body.datos.nombreApellido,
				mail: req.body.datos.mail,
				nombre: req.body.datos.nombre,
				apellido: req.body.datos.apellido,
				telefono: {numero: req.body.datos.telefono, codigoPais: '', area: ''},
				celular: req.body.datos.celular,
				uuid: req.body.datos.uuid,
				esAdministrador: false,
				activo: true,
				recibeNotif: true,
				contrasenia: SHA256(password),
				fechaAlta: req.body.datos.fechaAlta,
				fechaBaja: req.body.datos.fechaBaja
			});

			usuarioNuevo.save(function(err, data){
				if(err){
					winston.error("Error: " + err);
				}
				else{
					winston.debug("Usuario: " + data);

					winston.debug("Insertando usuario en su dpto...");

					consorcioEntity.findOne({codigo: req.body.datos.codigo}, function(er, doc){
						if(doc.pisos != ''){
							doc.pisos.forEach(function(piso, posP){
								piso.deptos.forEach(function(dpto, posD){
	    							if(dpto.codigo == req.body.datos.codigoDptoLote){
	    								winston.debug("Dpto " + JSON.stringify(dpto));

	    								var propietario = {idUsuario: data._id, tipo: req.body.datos.descripcion};

	    								dpto.propietarios.push(propietario);
	    								doc.save();

	    								data.contrasenia = password;

	    								res.json(data);
	    							}
								});
		    				});
	    				}
	    				else{
	    					doc.lotes.forEach(function(lote, posL){
	        					if(lote.codigo == req.body.datos.codigoDptoLote){
	        						var propietario = {idUsuario: data._id, tipo: req.body.datos.descripcion};
	            					
	            					lote.propietarios.push(propietario);
	            					doc.save();

	            					data.contrasenia = password;
									
									res.json(data);
	        					}
	    					});
	    				}
					});
				}
			});
		});
	}
};

module.exports.gcmId = function(req, res){
    usuario.findById(req.body.idUsuario)
    .exec(function(err, data) {
        if (err){
            winston.error("Error: " + err);
        }
        else{
        	winston.debug("GCM ID :" + req.body.gcmId);

            data.gcmId = req.body.gcmId;
            data.save();
            
            res.json(data);
        }
    });
};

module.exports.usuarioActivo = function(req, res){
	usuario.findById(req.params.idUsuario)
	.select('activo')
	.exec(function(err, data){
		if(err){
			winston.error("Error: " + err);
		}
		else{
			winston.debug("Activo? " + data.activo);
			
			res.json(data.activo);
		}
	});
};

module.exports.obtenerDatos = function(req, res){
	usuario.findById(req.params.idUsuario)
	.exec(function(err, data){
		if(err){
			winston.error("Error: " + err);
		}
		else{
			winston.debug("Usuario: " + data);
			res.json(data);
		}
	});
};

module.exports.actualizarDatos = function(req, res){
	usuario.findById(req.body.idUsuario)
	.exec(function(err, data){
		if(err){
			winston.error("Error: " + err);
		}
		else{
			data.mail = req.body.mail;
			data.telefono.numero = req.body.telefono;
			data.celular = req.body.celular;
			data.recibeNotif = req.body.recibeNotif;
			
			data.save(function(e, d){
				winston.debug("Datos actualizados: " + d);
				res.json(d);
			});
		}
	});
};

module.exports.unregisterGcmID = function(req, res){
	usuario.findById(req.body.idUsuario)
	.exec(function(err, data){
		if(err){
			winston.error("Error: " + err);
		}
		else{
			data.gcmId = '';
			
			data.save();
			
			res.json(data);
		}
	});
};

module.exports.generarContrasenia = function(req, res){
	usuario.findById(req.body.idUsuario)
	.exec(function(err, data){
		generator.generarPassword(usuario, function(password){
			data.contrasenia = SHA256(password);

			res.json(password);
		});
	});
};
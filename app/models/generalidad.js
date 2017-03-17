//Definicion del modelo de un usuario!
var mongoose 		= require('mongoose');
var winston			= require('winston');
var consorcioEntity = mongoose.model('consorcios');
var gcm 			= require('node-gcm');

var generalidadSchema = mongoose.Schema({
	usuarioRemitente: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'usuarios'
	},
	consorcios: [{
		type: mongoose.Schema.Types.ObjectId,
		ref:'consorcios'
	}],
	leidos: [{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'usuarios'
	}],
	leido: Boolean,
	asunto: String,
	mensaje: String,
	adjuntoGeneralidad: [{
        type: mongoose.Schema.Types.ObjectId,
        ref:'archivos'
    }],
    tieneImg: Boolean,
	fechaAlta: Date,
	fechaBaja: Date
});
var generalidad = mongoose.model('generalidades', generalidadSchema);

/******************* SERVICIO REST PARA CONSULTAS DE APLICACION WEB! =) *******************/

module.exports.obtenerGeneralidadesAll = function(req, res) {
	generalidad.find({})
    .populate('consorcios', 'direccion codigo')
    .exec(function(err, generalidades) {
        if (err)
            res.send(err);
        res.json(generalidades);
    });
};

module.exports.obtenerGeneralidadesByAdmin = function(req, res){
	consorcioEntity.find({ administrador: req.params.idAdministrador})	.select('_id')
	.exec(function(error, consorcios){
		generalidad.find({ consorcios: { "$in" : consorcios } }).sort({ fechaAlta: -1 })
		.or([{fechaBaja : ''},{fechaBaja: { $gt: new Date()}}])
		.populate({
		  path: 'consorcios',
		  match: { administrador: req.params.idAdministrador },
		  select: 'direccion codigo'
		})
	    .exec(function(err, generalidades) {
	        if (err){
	            res.send(err);
	        }
	        else{
	        	res.json(generalidades); 
	        }
	    });
	});
};

module.exports.obtenerGeneralidadByConsorcioId = function(req, res) {
	generalidad.find({ consorcios: { "$in" : [req.params.id]} }).sort({ fechaAlta: -1 })
	.or([{fechaBaja : ''},{fechaBaja: { $gt: new Date()}}])
    .populate('consorcios', 'direccion')
    .exec(function(err, generalidades) {
        if (err){
            res.send(err);
        }
        else{
        	res.json(generalidades);
        }
    });
};

module.exports.crear = function(req, res) {
    var generalidad_aux = new generalidad({
        usuarioRemitente: req.body.generalidad.usuarioRemitente,
        consorcios: req.body.generalidad.consorcios,
        asunto: req.body.generalidad.asunto,
        mensaje: req.body.generalidad.mensaje,
        adjuntoGeneralidad: req.body.generalidad.adjuntoGeneralidad,
		tieneImg: req.body.generalidad.tieneImg,
        leido: false,
        fechaAlta: new Date(),
        fechaBaja: ''
    });
    
    generalidad_aux.save(function(err,data){
        if(err){
            winston.error("Error: " + err);
        }
        else{
            winston.debug("Generalidad: " + data);
   		    
            res.json(data);
        }
    });
};

module.exports.eliminar = function (req, res){
    return generalidad.findById(req.params.id, function (err, generalidad_aux) {

        generalidad_aux.fechaBaja = new Date();

        return generalidad_aux.save(function (err, data) {
            if (!err)
            {
                winston.debug("generalidad dada de baja");
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
    generalidad.find({ usuarioRemitente: req.params.idAdministrador })
    .or([{fechaBaja : ''},{fechaBaja: { $gt: new Date()}}])
	.sort({periodo:-1})
	.exec(function(err, ultimo){
		if(ultimo != undefined && ultimo != ''){
			var fechaFinal = ultimo[0].fechaAlta.getFullYear();
			generalidad.find({ usuarioRemitente: req.params.idAdministrador })
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
module.exports.obtenerGeneralidades = function(req, res){
	generalidad.find({consorcios: {$in:[req.params.idConsorcio]}})
	.sort({fechaAlta: -1})
	.exec(function(err, data){
		if(err){
			winston.error("Error: " + err);
		}
		else{
			winston.debug("Mis generalidades: " + data);
			var estoy = false;
			var publicaciones = [];
			
			for(var g = 0; g < data.length; g++){
				//Verifico si estoy en la lista de leidos para cada publicacion
				if(data[g].leidos.length == 0){
					data[g].leidos.push(req.params.idUsuario);
				}
				else{
					for(var u = 0; u < data[g].leidos.length; u++){
						if(data[g].leidos[u] == req.params.idUsuario){
							estoy = true;
							
							break;
						}
					}
					
					if(!estoy){
						data[g].leidos.push(req.params.idUsuario);
					}
				}

				data[g].save();

				//Solo mostraré al usuarios las publicaciones que estan vigentes
				if(data[g].fechaBaja > new Date() || data[g].fechaBaja == null){
					publicaciones.push(data[g]);
				}
			}
			
			res.json(publicaciones);
		}
	});
};

module.exports.notifGeneralidades = function(req, res){
	generalidad.find({$and: [{consorcios: {$in:[req.params.idConsorcio]}}, {leidos: {$ne: req.params.idUsuario}}]})
	.count()
	.exec(function(err, data){
		if(err){
			winston.error("Error: " + err);
		}
		else{
			winston.debug("Generalidades no leidas: " + data);

			res.json(data);
		}
	});
};
//Definicion del modelo de una expensa!
var mongoose    = require('mongoose');
var winston			= require('winston');
var fs          = require('fs');
var consorcioEntity = mongoose.model('consorcios');

var expensaSchema = mongoose.Schema({
    consorcio:     {
        type: mongoose.Schema.Types.ObjectId,
        ref:'consorcios'
    },
    periodo: {
                    mes: Number,
                    anio: Number
                },
    liquidacion:[{
        type: mongoose.Schema.Types.ObjectId,
        ref:'archivos'
    }],
    leidos: [{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'usuarios'
	}],
    adjuntosExpensa: [ {
        type: mongoose.Schema.Types.ObjectId,
        ref:'archivos'
    }]
});

var expensa = mongoose.model('expensas', expensaSchema);

/******************* SERVICIO REST PARA CONSULTAS DE APLICACION WEB! =) *******************/
module.exports.obtenerFiltroAniosByAdmin = function(req, res){
	var ddlAnios = [];
	
	consorcioEntity.find({ administrador: req.params.idAdministrador })
    .select('_id')
    .sort({periodo:-1})
    .exec(function(error, consorcios){
        expensa.find({ consorcio: { "$in" : consorcios } })
		.sort({periodo:-1})
		.exec(function(err, ultimo){
			if(ultimo != undefined && ultimo != ''){
				var fechaFinal = ultimo[0].periodo.anio;
				expensa.find({ consorcio: { "$in" : consorcios } })
				.sort({periodo:1})
				.exec(function(err, primero){
					if(primero != undefined && primero != ''){
						var fechaInicial = primero[0].periodo.anio;
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

module.exports.obtenerExpensas = function(req, res) {
    expensa.find()
    .populate('consorcio')
    .sort({periodo:-1})
    .exec(function(err, expensas) {
        // if there is an error retrieving, send the error. 
        // nothing after res.send(err) will execute
        if (err){
            res.send(err);
        }
        
        res.json(expensas); // return all heroes in JSON format
    });
};

module.exports.obtenerExpensasById = function (req, res){
    expensa.findById(req.params.id)
    .populate('consorcio')
    .exec(function(err, data){
        if(err){
            winston.error("Error: " + err);
        }
        else{
            res.json(data);
        }
    });
};

module.exports.expensaByExpensa = function (req, res) {
    expensa.find({$and:[{'consorcio' : req.query.consorcio}, {'periodo.anio' : req.query.anio}, {'periodo.mes' : req.query.mes}]})
    .exec(function (err, data) {
        if (err){
            res.send(err);
        }

        res.json(data);
    })
};

module.exports.obtenerExpensasByAdmin = function(req, res) {
    consorcioEntity.find({ administrador: req.params.idAdministrador})
    .select('_id')
    .exec(function(error, consorcios){
        expensa.find({ consorcio: { "$in" : consorcios } })
        .populate({
            path: 'consorcio',
            match: { administrador: req.params.idAdministrador },
            select: 'direccion codigo'
        })
        .sort({periodo:-1})
        .exec(function(err, expensas) {
            // if there is an error retrieving, send the error. 
            // nothing after res.send(err) will execute
            if (err){
                res.send(err);
            }
            
            res.json(expensas); // return all heroes in JSON format
        });
    });
};

module.exports.adjuntoExpensaById = function (req, res){
    expensa.findById(req.params.id)
    .select('adjuntosExpensa')
    .exec(function (err, data){
        if (err) {
            res.send(err);
        }

        for (var i = 0; i < data.adjuntosExpensa.length; i++) {
            if (data.adjuntosExpensa[i]._id == req.params.idImagen) 
            {
                var datos = new Buffer(data.adjuntosExpensa[i].data).toString('base64');
                var contentType = data.adjuntosExpensa[i].contentType;
                
                var imagen = 'data:' + contentType + ';base64,' + datos;
            }
        }
        res.json(imagen);
    });
};

module.exports.adjuntosExpensa = function (req, res){
    expensa.findById(req.params.id)
    .select('adjuntosExpensa')
    .exec(function (err, data){
        if (err) {
            res.send(err);
        }

        var imagenes = [];

        for (var i = 0; i < data.adjuntosExpensa.length; i++) {

            var datos = new Buffer(data.adjuntosExpensa[i].data).toString('base64');
            var contentType = data.adjuntosExpensa[i].contentType;
            
            var imagen = 'data:' + contentType + ';base64,' + datos;
            
            imagenes.push(imagen);
        }
        
        res.json(imagenes);
    });
};

module.exports.adjuntosIdExpensa = function (req, res){
    expensa.findById(req.params.id)
    .select('adjuntosExpensa._id')
    .exec(function (err, data){
        if (err) {
            res.send(err);
        }

        var imagenes = [];

        for (var i = 0; i < data.adjuntosExpensa.length; i++) {

            var id = data.adjuntosExpensa[i]._id;
            imagenes.push(id);
        }
        res.json(imagenes);
    });
};

module.exports.updateAdjuntosExpensas = function (req, res){
    expensa.findById(req.params.id, function (err, expensa_aux) {

        expensa_aux.adjuntosExpensa = req.body.expensa.adjuntosExpensa;

        expensa_aux.save(function (err, data) {
            if (!err)
            {
                winston.debug("adjunto expensa updated");
                res.json(data);
            }
            else 
            {
                winston.error(err);
            }
        });
    });
};

module.exports.updateExpensas = function (req, res){
    return expensa.findById(req.params.id, function (err, expensa_aux) {
        expensa_aux.consorcio       = req.body.expensa.consorcio;
        expensa_aux.periodo         = req.body.expensa.periodo;
        expensa_aux.adjuntosExpensa = req.body.expensa.adjuntosExpensa;

        return expensa_aux.save(function (err) {
            if (!err)
            {
                winston.debug("expensa updated");
            }
            else 
            {
                winston.error(err);
            }
            return res.send(true);
        });
    });
};

module.exports.crear = function (req, res) {

    var expensa_aux = new expensa({
        consorcio: req.body.expensa.consorcio ,
        periodo: {
            anio: req.body.expensa.periodo.anio,
            mes: req.body.expensa.periodo.mes
        },
        adjuntosExpensa: req.body.expensa.adjuntosExpensa,
        liquidacion: req.body.expensa.liquidacion
    });
    
    expensa_aux.save(function (err, data){
        if(err){
            winston.error("Error: " + err);
        }
        else
        {
            res.json(data);
        }
    });
};

module.exports.eliminar = function (req, res) {
    expensa.remove({
        _id: req.params.expensa
    }, function(err, data){
        if(err){
            res.send(err);
        }
        
        expensa.find(function(err, expensas){
            if(err){
                res.send(err);
            }
            
            res.json(expensas);
        });
    });
};

/******************* SERVICIO REST PARA CONSULTAS DE APLICACION MOBILE! =) *******************/
module.exports.expensaByConsorcioId = function (req, res){
	expensa.find({ 'consorcio' : req.params.id})
    .sort({periodo:-1})
    .populate('consorcio')
    .exec(function(err, data) {
        if (err){
            res.send(err);
        }
        else{
        	winston.debug("Expensas: " + data);
            var estoy = false;
    		
    		for(var e = 0; e < data.length; e++){
    			if(data[e].leidos.length == 0){
    				data[e].leidos.push(req.params.idUsuario);
    			}
    			else{
    				for(var u = 0; u < data[e].leidos.length; u++){
    					if(data[e].leidos[u] == req.params.idUsuario){
    						estoy = true;
    						
    						break;
    					}
    				}
    				
    				if(!estoy){
    					data[e].leidos.push(req.params.idUsuario);
    				}
    			}
    			
    			data[e].save();
    		}
    		
    		res.json(data);
        }
    });
};

module.exports.expensas = function (req, res){
	expensa.findById(req.params.id)
	.exec(function(err, data){
		if(err){
			winston.error("Error: " + err);
		}
		else{
			winston.debug("Expensa: " + data);
			res.json(data);
		}
	});
};

module.exports.notifExpensas = function(req, res){
	expensa.find({$and: [{consorcio: req.params.idConsorcio}, {leidos: {$ne: req.params.idUsuario}}]})
	.count()
	.exec(function(err, data){
		if(err){
			winston.error("Error: " + err);
		}
		else{
			winston.debug("Expensas no leidas: " + data);

			res.json(data);
		}
	});
};
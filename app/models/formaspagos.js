//Definicion del modelo de formas de pago!
var mongoose = require('mongoose');
var winston			= require('winston');

var formaspagoSchema = mongoose.Schema({
	nombre: String,
	administrador: mongoose.Schema.Types.ObjectId
});

var formaPago = mongoose.model('formaspagos', formaspagoSchema);

/******************* SERVICIO REST PARA CONSULTAS DE APLICACION WEB! =) *******************/
module.exports.obtenerFormasPagoByAdmin = function(req, res) {
	formaPago.find({administrador: req.params.idAdmin})
	.exec(function(err, data) {
	    if (err){
	    	res.send(err);
	    }
	    res.json(data); 
	});
};

module.exports.obtenerFormasPago = function(req, res) {
	formaPago.find(function(err, data) {
	    if (err){
	    	res.send(err);
	    }
	    
	    res.json(data); 
	});
};

module.exports.obtenerDdlFormasPagoByAdmin = function(req, res) {
	formaPago
    .find({ administrador: req.params.idAdmin })
    .sort({'nombre': 1})
	.exec(function(err, formasPago) {
        if (err){
            res.send(err);
        }
        
        res.json(formasPago); 
    });
};

module.exports.obtenerDdlFormasPago = function(req, res) {
	formaPago
    .find()
	.exec(function(err, formasPago) {
        if (err){
            res.send(err);
        }
        
        res.json(formasPago); 
    });
};

module.exports.crearByAdmin = function(req, res) {
	var auxFormaPago = new formaPago({
		nombre: req.params.nombre,
		administrador: req.params.idAdmin
	});
	
	auxFormaPago.save(function(err, data){
		if(err){
			winston.error("Error generando forma de pago");
		}
		else{
			res.json(data);
		}
	});
};

module.exports.crear = function(req, res){
	var auxFormaPago = new formaPago({
		nombre: req.params.nombre
	});
	
	auxFormaPago.save(function(err, data){
		if(err){
			winston.error("Error generando forma de pago");
		}
		else{
			res.json(data);
		}
	});
};

module.exports.eliminar = function(req, res) {
	formaPago.remove({_id: req.params.id}, function(err, data){
		if (err){
			winston.debug("An error has ocurred while deleting clientes entity. See de details below:");
            res.send(err);
        }

		res.json(data);
    });
};
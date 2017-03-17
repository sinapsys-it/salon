//Definicion del modelo de una expensa!
var mongoose    = require('mongoose');
var winston			= require('winston');
var fs          		 = require('fs');

var archivoSchema = mongoose.Schema({
    archivo: {
        data: Buffer,
        contentType: String
    },
    nombre: String,
    fechaAlta: Date,
    fechaBaja: Date
});

var archivo = mongoose.model('archivos', archivoSchema);


module.exports.obtenerArchivoById = function (req, res){
    archivo.findById(req.params.id)
    .exec(function(err, data){
        if(err)
        {
            winston.error("Error: " + err);
        }
        else
        {
            var datos = new Buffer(data.archivo.data).toString('base64');
            var contentType = data.archivo.contentType;

            var file = {
                        id: data._id,
                        imagen: 'data:' + contentType + ';base64,' + datos,
                        nombre: data.nombre
                    };

            res.json(file);
        }
    });
};

module.exports.crearArchivos = function (req, res) {
    var archivos = req.files;
    var indice = Object.keys(archivos);
    var respuesta = [];
    for (var i = 0; i < indice.length; i++) 
    {
        var file = {
            data: fs.readFileSync(archivos[indice[i]].path),
            contentType: archivos[indice[i]].type
        }
        var archivo_aux = new archivo({
            archivo: file,
            fechaAlta: new Date(),
            fechaBaja: '',
            nombre: archivos[indice[i]].name
        });

        winston.debug(archivos[indice[i]].name);
    
        archivo_aux.save(function (err, data){
            if(err){
                winston.error("Error: " + err);
            }
            else
            {
                respuesta.push(data._id);
                if (indice.length == respuesta.length)
                {
                    res.json(respuesta)
                }
            }
        });
    };
};

module.exports.eliminarArchivo = function(req, res) {
    archivo.remove({
        _id: req.body.id
    }, function(err, data){
        if(err){
            res.send(err);
        }
        res.json(data);
    });
};

/******************* SERVICIO REST PARA CONSULTAS DE APLICACION MOBILE! =) *******************/
module.exports.guardarImagen = function(req, res){
	fs.readFile(req.file.path, function (err, dataI) {
		var img = new Buffer(dataI, 'base64');

		var reclamoImg = {
			data: img,
			contentType: req.file.mimetype
		};
		
		var archivoNuevo = new archivo({
			archivo: reclamoImg,
			nombre: req.file.originalname,
			fechaAlta: new Date(),
	        fechaBaja: ''
		});
				
		archivoNuevo.save(function(err, data){
			if(err){
				winston.error("Error: " + err);
			}
			else{
				winston.debug("Imagen: " + data);				
				res.json(data);
			}
		});
	});
};

module.exports.obtenerArchivo = function(req, res){
	archivo.findById(req.params.idArchivo)
	.exec(function(err, data){
		var datos = new Buffer(data.archivo.data).toString('base64');
        var contentType = data.archivo.contentType;
        var img = 'data:' + contentType + ';base64,' + datos;
		
		var respuesta = {
			idImagen: data._id,
			imagen: img
		};
		
		winston.debug("Respuesta: " + respuesta);
		
		res.json(respuesta);
	});
};
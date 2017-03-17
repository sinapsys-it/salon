// Rutas para los llamados a la API

var archivoEntity       = require('./models/archivo');
var dispositivoEntity	= require('./models/dispositivo');
var consorcioEntity		= require('./models/consorcio');
var usuarioEntity       = require('./models/usuario');
var mensajeEntity       = require('./models/mensaje');
var formaspagosEntity   = require('./models/formaspagos');
var telefonosEntity     = require('./models/telefono');
var novedadesEntity     = require('./models/novedad');
var generalidadesEntity = require('./models/generalidad');
var expensaEntity       = require('./models/expensa');
var pagoEntity			= require('./models/pago');
var votacionEntity		= require('./models/votacion');
var reclamoEntity		= require('./models/reclamo');
var especialidadEntity	= require('./models/especialidad');
var paisesEntity        	= require('./models/paises');
var conversacionEntity  = require('./models/conversacion');
var dictionary          = require('../node_modules/dictionaryjs/dictionaryjs.js');
var nodemailer          = require('nodemailer');
var multer  		    = require('multer');
var winston         = require('winston');

/*--Upload file--*/
var multipart	= require('connect-multiparty');
var fs			= require("fs");
/*--Upload file--*/

var upload = multer({dest: process.env.TMPDIR});  

/*--Mongoose--*/
var mongoose	= require('mongoose');
var ObjectId	= mongoose.Types.ObjectId;

var dict_evento = new dictionary();
var dict_especialidad = new dictionary();


/*------------------SMTP Over-----------------------------*/
var smtpTransport = nodemailer.createTransport("SMTP",{
    service: "Gmail",
    auth: {
        //user: "Condominium.Noreply@gmail.com",
        user: "ADeCon.Noreply@gmail.com",
        pass: "Acciona2015"
    }
});

module.exports = function(app) {

/******************* SERVICIO REST COMMON! =) *******************/
    app.get('/app/estadoConexion', function(req, res){
    	var tipoEstado = mongoose.connection.readyState;

		res.json(tipoEstado == 1);
    });
    
    //TODO on signIn!
    app.post('/api/forgetPassword', function(req, res){
    	
    });
    
    //Envio de mails
    app.post('/api/sendContacto', function(req, res){
    	var mailBody = 
    		'<!DOCTYPE html><html><body><table style="width: 100%; background-color: #29abe2;"><tr><td style="width: 20%; "></td><td style="text-align: right;"><label style="margin-right: 10%; margin-bottom: 20px; font-family: Tahoma; font-size: 24pt; color: white;">Condominium | Contacto</label></td></tr></table><br><table style="margin-left: 2%;"><tr><td><pre style="font-family: Tahoma; font-size: 11pt;color: black;">' + req.body.contacto.mensaje + '</></td></tr></table><br><br><p><b>Nota:</b> Puedes contestar este contacto al remitente haciendo click en el siguiente enlace <a href=mailto:lucas.moglia@acciona-it.com?Subject=asdasd target="_top">lucas.moglia@acciona-it.com</a></p></body></html>';

	    	var mailOptions = {
	            from: "Condominium | Contacto <" + req.body.contacto.from + ">",
	            to : req.body.contacto.to,
	            subject : req.body.contacto.asunto,
	            html : mailBody
	        }
	    	
	    	smtpTransport.sendMail(mailOptions, function(error, response){
	            if(error)
	            {
	                winston.debug(error);
	                res.end("error");
	            }
	            else
	            {
	                winston.debug("Mail enviado");
	                res.end("sent");
	            }
	        });
    });
    
    app.get('/api/sendMail', function(req,res){
        var mailOptions = {
            from: "adm@adm.com",
            to : req.query.to,
            subject : req.query.subject,
            html : req.query.html
        }
        smtpTransport.sendMail(mailOptions, function(error, response){
            if(error)
            {
                winston.debug(error);
                res.end("error");
            }
            else
            {
                winston.debug("Mail enviado");
                res.end("sent");
            }
        });
    });
    //END Envio de mails

    //Tipo de evento - Diccionario
    app.get('/app/eventoTipo/:key', function(req, res) {
        res.json(dict_evento.get(req.params.key));
    });
    //Tipo de evento - Diccionario
    app.get('/app/eventoTipo', function(req, res) {
        var dict_array = new Array();

        dict_evento.getKeys().forEach(function(item){
            dict_array.push({ id: dict_evento[item], nombre: item });
        });
        
        res.json(dict_array);
    });
    
    //Tipo de evento - Obtener descripción partiendo de un valor almacenado
    app.get('/app/eventoTipoDesc/:value', function(req,res){
        res.json(dict_evento.getKeys()[req.params.value - 1]);
    });

    //Tipo de evento - Diccionario
    app.get('/app/especialidadTipo/:key', function(req, res) {
        res.json(dict_especialidad.get(req.params.key));
    });
    //Tipo de evento - Diccionario
    app.get('/app/especialidadTipo', function(req, res) {
        var dict_array = new Array();

        dict_especialidad.getKeys().forEach(function(item){
            dict_array.push({ id: dict_especialidad[item], nombre: item });
        });
        
        res.json(dict_array);
    });
    //Tipo de evento - Obtener descripción partiendo de un valor almacenado
    app.get('/app/especialidadDesc/:value', function(req,res){
        res.json(dict_especialidad.getKeys()[req.params.value - 1]);
    });
    
    //Codigo de consorcio y dpto o lote - Divide ambos codigos
    app.get('/app/splitCodigoConsorcio/:value', function(req, res){
    	var codigos = req.params.value;
    	var cods_array = new Array();

    	cods_array.push(codigos.slice(0, 5));//codigo de consorcio
    	cods_array.push(codigos.slice(5, 8));//codigo de dpto o lote

    	res.json(cods_array);
    });

    //Cuenta el numero de eventos nuevos para mensajes, reclamos y pagos por consorcio
    app.get('/api/countEvents/:idsConsorcios', function(req, res){
        var pagosModel = mongoose.model('pagos');
        var reclamosModel = mongoose.model('reclamos');
        var conversacionesModel = mongoose.model('conversaciones');
        var idsConsorcios = [];
        var countEvents = [];

        for(var x = 0; x < req.params.idsConsorcios.split(',').length; x++){
            idsConsorcios.push(req.params.idsConsorcios.split(',')[x]);
        }

        idsConsorcios.forEach(function(idConsorcio, x){
            var event = {
                idConsorcio: idConsorcio,
                mensajes: 0,
                reclamos: 0,
                pagos: 0,
                total: 0
            };

            pagosModel.find({$and: [{consorcio: idConsorcio}, {leido: false}]})
            .count()
            .lean()
            .exec(function(errP, countPagos){
                event.pagos = countPagos;

                reclamosModel.find({$and: [{consorcio: idConsorcio}, {leido: false}]})
                .count()
                .lean()
                .exec(function(errR, countReclamos){
                    event.reclamos = countReclamos;

                    conversacionesModel.find()
                    .select('avistantes.noLeidos')
                    .lean()
                    .exec(function(errM, countMensajes){
                        var countNoLeios = 0;

                        if(countMensajes[0]){
                            for(var y = 0; y < countMensajes[0].avistantes.length; y++){
                                if(countMensajes[0].avistantes[y].noLeidos > 0){
                                    countNoLeios++;
                                }
                            }

                            event.mensajes = countNoLeios;
                            event.total = countNoLeios + countReclamos + countPagos;

                            countEvents.push(event);

                            if(idsConsorcios.length == countEvents.length){
                                res.json(countEvents);
                            }
                        }
                        else{
                            event.mensajes = countNoLeios;
                            event.total = countNoLeios + countReclamos + countPagos;

                            countEvents.push(event);

                            if(x == (idsConsorcios.length - 1)){
                                res.json(countEvents);
                            }
                        }
                    });
                });
            });
        });
    });
    
/******************* SERVICIO REST PARA CONSULTAS DE APLICACION WEB! =) *******************/

    /****NOVEDADES****/
    app.get('/api/novedadesByConsorcioId/:id', novedadesEntity.obtenerNovedadByConsorcioId);
    app.get('/api/novedadesByAdmin/:idAdministrador', novedadesEntity.obtenerNovedadesByAdmin);
    app.post('/api/novedades', novedadesEntity.crear);//SAVE
    app.post('/api/eliminarNovedad/:id', novedadesEntity.eliminar);//ELIMINACION LOGICA
    app.get('/api/novedadFiltroAniosByAdmin/:idAdministrador', novedadesEntity.obtenerFiltroAniosByAdmin);

    /****GENERALIDADES****/
    app.get('/api/generalidadesByConsorcioId/:id', generalidadesEntity.obtenerGeneralidadByConsorcioId);
    app.get('/api/generalidadesByAdmin/:idAdministrador', generalidadesEntity.obtenerGeneralidadesByAdmin);
    app.post('/api/generalidades', generalidadesEntity.crear);//SAVE
    app.post('/api/eliminarGeneralidad/:id', generalidadesEntity.eliminar);//ELIMINACION LOGICA
    app.get('/api/generalidadFiltroAniosByAdmin/:idAdministrador', generalidadesEntity.obtenerFiltroAniosByAdmin);
    
    /****TELEFONOS****/
    app.get('/api/telefonoByConsorcioId/:id', telefonosEntity.obtenerTelefonoByConsorcioId);
    app.get('/api/telefonosByAdmin/:idAdministrador', telefonosEntity.obtenerTelefonosByAdmin);
    app.get('/api/telefonosByEspecialidad/:idEspecialidad', telefonosEntity.obtenerTelefonoByEspecialidadId);
    app.post('/api/telefonos', telefonosEntity.crear);
    app.put('/api/updateTelefono/:id', telefonosEntity.editar);
    app.put('/api/cambiarEstadoTelefono/:id', telefonosEntity.cambiarEstado);
    app.post('/api/eliminarTelefono/:id', telefonosEntity.eliminar);

	/****MENSAJES****/
    app.get('/api/mensajesByDestinatario/:idDestinatario', mensajeEntity.obtenerMensajePorDestinatario);
    app.get('/api/adjuntoMensajeById/:id', mensajeEntity.obtenerAdjuntoByMensajeId);
    app.get('/api/countNoLeidosByConversacion/:idConversacion', conversacionEntity.countNoLeidosByConversacion);
    
    /****USUARIOS****/
    app.get('/api/usuarios/:idRemitente', usuarioEntity.obtenerUsuarioById);
    app.get('/api/usuariosPropietarios', usuarioEntity.obtenerPropietarios);
    app.get('/api/usuariosPropietariosByAdmin/:idAdministrador', usuarioEntity.obtenerPropietariosByAdmin);
    app.post('/api/usuarios', usuarioEntity.crear);
    app.post('/api/eliminarUsuarioById/:id/:codigoConsorcio/:idAdministrador', usuarioEntity.eliminar);
    app.get('/api/usuarioByMail', usuarioEntity.obtenerUsuarioByMail);
    app.get('/api/propInqByMail', usuarioEntity.obtenerPropInqByMail);
    app.get('/api/usuarioByConsorcioId/:id', usuarioEntity.obtenerUsuarioByConsorcioId);
    app.get('/api/usuariosPropietariosByConsorcioId/:id', usuarioEntity.obtenerPropietariosByConsorcioId);
    app.get('/api/ddlUsuariosByQueryAndAdmin/:qNombreUsuario/:idAdministrador', usuarioEntity.obtenerPropietariosByQueryAndAdmin);
    app.get('/api/ddlUsuariosAndCByQueryAndAdmin/:qNombreUsuario/:idAdministrador', usuarioEntity.obtenerPropietariosAndCByQueryAndAdmin);
    
    app.get('/api/ddlUsuariosByQueryAndUsuarios/:qNombreUsuario/:usuarios', usuarioEntity.obtenerUsuarioByQueryAndUsuarios);
    app.get('/api/ddlUsuariosByQuery/:qNombreUsuario', usuarioEntity.obtenerUsuarioByQuery);
    app.get('/api/ddlUsuariosByQuery/', usuarioEntity.obtenerUsuariosAll);
    app.get('/api/ddlUsuarios', usuarioEntity.obtenerDdlUsuarios);
    app.get('/api/cambiarEstadoUsuario/:id', usuarioEntity.cambiarEstado);
    app.get('/api/verifyUniqueEmail/:mail', usuarioEntity.verificarEmail);

    /****CONSORCIOS****/
    app.get('/api/consorciosByAdmin/:idAdministrador', consorcioEntity.obtenerConsorciosByAdmin);
    app.get('/api/consorcioByFormaPago/:idFormaPago', consorcioEntity.obtenerConsorcioByFormaPago);
    app.get('/api/ddlConsorcios', consorcioEntity.obtenerDdlConsorcios);
    app.get('/api/ddlConsorciosByAdmin/:id', consorcioEntity.obtenerDdlConsorciosByAdmin);
    app.get('/api/ddlConsorciosByQuery/:qDireccion', consorcioEntity.obtenerConsorcioByQuery);
    app.get('/api/ddlConsorciosByQueryAndAdmin/:qDireccion/:idAdministrador', consorcioEntity.obtenerConsorciosByQueryAndAdmin);
    app.get('/api/consorcios/:id', consorcioEntity.obtenerConsorcioById);
    app.get('/api/getDetalleConsorcio/:id', consorcioEntity.obtenerDetalleConsorcioById);
    app.get('/api/consorcioImagenById/:id', consorcioEntity.obtenerConsorcioImagenById);
    app.get('/api/esCodigoUnico/:codigo', consorcioEntity.esCodigoUnico);
    app.get('/api/verifyUniqueConsorcioAddress/:direccion/:idAdministrador', consorcioEntity.verificarAddress);
    app.put('/api/updateConsorcio/:id', consorcioEntity.editar);
    app.put('/api/updateImagenConsorcio/:id', consorcioEntity.editarImagen);
    app.post('/api/consorcios', consorcioEntity.crear);
    app.post('/api/imagenConsorcios/:id', multipart(), consorcioEntity.subirImagen);
    app.post('/api/consorcios/:consorcio', consorcioEntity.eliminar);
    
    /****FORMAS DE PAGO****/
    app.get('/api/formaspagos/:idAdmin', formaspagosEntity.obtenerFormasPagoByAdmin);
    app.get('/api/ddlFormaspagos', formaspagosEntity.obtenerDdlFormasPago);
    app.get('/api/ddlFormaspagos/:idAdmin', formaspagosEntity.obtenerDdlFormasPagoByAdmin);
    app.get('/api/crearPagos/:nombre', formaspagosEntity.crear);
    app.post('/api/formaspago/:nombre/:idAdmin', formaspagosEntity.crearByAdmin);
    app.post('/api/formaspago/:id', formaspagosEntity.eliminar);
    
    /****ESPECIALIDADES****/
    app.get('/api/especialidades/:idAdmin', especialidadEntity.obtenerEspecialidadesByAdmin);
    app.get('/api/especialidadById/:id', especialidadEntity.obtenerEspecialidadById);
    app.get('/api/crearEspecialidad/:nombre', especialidadEntity.crear);
    app.post('/api/especialidades/:nombre/:idAdmin', especialidadEntity.crearByAdmin);
    app.post('/api/especialidades/:id', especialidadEntity.eliminar);

    /****PAISES****/
    app.get('/api/paises', paisesEntity.obtenerPaises);
    app.get('/api/crearPais', paisesEntity.crear);
    
    /****EXPENSAS****/
    app.get('/api/expensaByExpensa', expensaEntity.expensaByExpensa);
    app.get('/api/expensaByConsorcioId/:id', expensaEntity.expensaByConsorcioId);
    app.get('/api/expensasByAdmin/:idAdministrador', expensaEntity.obtenerExpensasByAdmin);
    app.get('/api/expensas/:id', expensaEntity.obtenerExpensasById);
    app.get('/api/expensaFiltroAniosByAdmin/:idAdministrador', expensaEntity.obtenerFiltroAniosByAdmin);
    app.put('/api/updateAdjuntosExpensas/:id', expensaEntity.updateAdjuntosExpensas);
    app.post('/api/expensas', expensaEntity.crear);
    app.post('/api/expensas/:expensa', expensaEntity.eliminar);
    
    /********PAGOS********/
    app.get('/api/pagosByConsorcioId/:id', pagoEntity.obtenerPagosPorIdConsorcio);
    app.get('/api/pagosByAdmin/:idAdministrador', pagoEntity.obtenerPagosByAdmin);
    app.get('/api/pagosFiltroAniosByAdmin/:idAdministrador', pagoEntity.obtenerFiltroAniosByAdmin);
    app.get('/api/pagosFiltroAniosPagosByAdmin/:idAdministrador', pagoEntity.obtenerFiltroAniosPagosByAdmin);
    app.post('/api/markRead', pagoEntity.markRead);
    
    /******VOTACIONES****/
    app.get('/api/votacion/:idVotacion', votacionEntity.obtenerVotacion);
    app.get('/api/votacionesByConsorcioId/:id', votacionEntity.obtenerVotacionesByConsorcio);
    app.get('/api/votacionesByAdmin/:idAdministrador', votacionEntity.obtenerVotacionesByAdmin);
    app.post('/api/crearVotacion', votacionEntity.crear);
    
    /******RECLAMOS****/
    app.get('/api/reclamosByConsorcioId/:id', reclamoEntity.obtenerReclamosPorIdConsorcio);
    app.get('/api/reclamosByAdmin/:idAdministrador', reclamoEntity.obtenerReclamosByAdmin);
    app.get('/api/obtenerAdjuntoReclamo/:id', reclamoEntity.obtenerAdjuntoReclamo);
    app.get('/api/reclamoFiltroAniosByAdmin/:idAdministrador', reclamoEntity.obtenerFiltroAniosByAdmin);
    app.post('/api/markReadReclamo', reclamoEntity.markReadReclamo);
    
    /******ARCHIVOS****/
    app.get('/api/obtenerArchivoById/:id', archivoEntity.obtenerArchivoById);
    app.post('/api/crearArchivos',multipart(), archivoEntity.crearArchivos);
    app.post('/api/eliminarArchivo', archivoEntity.eliminarArchivo);


    
    app.get('/app/mensajesMatalosATodos', function(req, res){
    	mongoose.connection.db.dropCollection('mensajes', function(err, result) {
    		mongoose.connection.db.dropCollection('conversaciones', function(err, result) {
        		winston.debug("Mensajes y conversaciónes borradas...");
    			res.json(result);
        	});
    	});
    });

/******************* SERVICIO REST PARA CONSULTAS DE APLICACION MOBILE! =) *******************/
	/****USUARIOS****/
    app.get('/mapi/usuarioExiste/:uuid', dispositivoEntity.obtenerDispositivo);
    app.get('/mapi/getUsuario', usuarioEntity.obtenerUsuario);
    app.get('/mapi/usuarioActivo/:idUsuario', usuarioEntity.usuarioActivo);
    app.get('/mapi/obtenerDatosUsuario/:idUsuario', usuarioEntity.obtenerDatos);
    app.post('/mapi/eliminarUsuarioById/:id', usuarioEntity.eliminar);
    app.post('/mapi/registroUsuario', usuarioEntity.registrarUsuario);
    app.post('/mapi/actualizarUsuario', usuarioEntity.actualizarDatos);
    app.post('/mapi/gcmId', usuarioEntity.gcmId);
    app.post('/mapi/unregisterGcmId', usuarioEntity.unregisterGcmID);
    app.post('/mapi/generarContrasenia', usuarioEntity.generarContrasenia);

    /****LOGIN****/
    app.get('/mapi/login', consorcioEntity.verificarConsorcio);
    app.get('/mapi/verificarConsorcioWeb/:codigos/:idUsuario', consorcioEntity.verificarConsorcioWeb);

    /****DISPOSITIVO****/
    app.post('/mapi/registroDispositivo', dispositivoEntity.registrarDispositivo);
    app.post('/mapi/eliminarDispositivo/:uuid', dispositivoEntity.eliminar);
    
    /****CONSORCIOS****/
    app.get('/mapi/getConsorcio', consorcioEntity.obtenerConsorcio);
    app.get('/mapi/getMisConsorcios', consorcioEntity.obtenerMisConsorcios);
    app.get('/mapi/datosLocalStorage/:uuid', consorcioEntity.localStorage);
    app.get('/mapi/ddlUsuariosAndCByQueryAndAdmin/:qNombreUsuario/:idUsuario/:codigoConsorcio', consorcioEntity.obtenerContactosByQuery);
    app.get('/mapi/pagosForma/:idConsorcio', consorcioEntity.formasPagos);
    
    /****NOVEDADES****/
    app.get('/mapi/novedades/:idConsorcio', novedadesEntity.obtenerNovedades);
    app.get('/mapi/novedadDetalle/:idNovedad', novedadesEntity.obtenerNovedad);
    
    /****GENERALIDADES****/
    app.get('/mapi/generalidades/:idConsorcio/:idUsuario', generalidadesEntity.obtenerGeneralidades);

    /****VOTACIONES****/
    app.get('/mapi/votosVigentes/:idConsorcio', votacionEntity.obtenerVotosVigentes);
    app.get('/mapi/votosFinalizados/:idConsorcio', votacionEntity.obtenerVotosFinalizados);
    app.get('/mapi/votacionDetalle/:idVotacion', votacionEntity.obtenerVotacion);
    app.post('/mapi/votar', votacionEntity.votar);
    app.post('/mapi/comentar', votacionEntity.comentar);

    /****RECLAMOS****/
    app.get('/mapi/reclamos', reclamoEntity.obtenerReclamos);
    app.get('/mapi/reclamoDetalle/:idReclamo', reclamoEntity.obtenerReclamo);
    app.post('/mapi/reclamoNuevo', reclamoEntity.nuevoReclamo);

    /****EXPENSAS****/
    app.get('/mapi/expensas/:id/:idUsuario', expensaEntity.expensaByConsorcioId);
    app.get('/mapi/expensaDetalle/:id', expensaEntity.expensas);
    
    /****TELEFONOS UTILES****/
    app.get('/mapi/telefonosUtiles/:idConsorcio', telefonosEntity.obtenerTelefonos);
    app.get('/mapi/telefonoDetalle/:idTelefono', telefonosEntity.obtenerTelefono);
    
    /****CONVERSACIONES****/
    app.get('/mapi/getMisContactos', consorcioEntity.obtenerMisContactos);
    app.get('/app/obtenerConversaciones/:idUsuario/:idConsorcio', conversacionEntity.obtenerConversaciones);
    app.get('/app/obtenerConversacion/:idConversacion', mensajeEntity.obtenerConversacion);
    app.get('/app/verificarConversacion/:participantes', conversacionEntity.verificarConversacion);
    app.get('/app/obtenerMensajesNuevos/:idConversacion/:fechaUltimoMensaje/:idUsuario', mensajeEntity.obtenerMensajesNuevos);
    app.get('/app/obtenerHistorial/:idConversacion/:skip', mensajeEntity.obtenerHistorial);
    app.post('/app/crearConversacion', conversacionEntity.crearConversacion);
    app.post('/app/crearMensaje', mensajeEntity.crearMensaje);
    app.post('/app/actualizarConversacion', conversacionEntity.actualizarConversacion);

    /****PAGOS****/
    app.get('/mapi/pagos/:codigosConsorcio', pagoEntity.obtenerPagos);
    app.get('/mapi/pagoDetalle/:idPago', pagoEntity.obtenerPago);
    app.post('/mapi/pagoNuevo', pagoEntity.nuevoPago);

    /****NOTIFICACIONES****/
    app.get('/mapi/notificacionesMensaje/:idUsuario', conversacionEntity.notifMensajes);
    app.get('/mapi/notificacionesNovedad/:idConsorcio', novedadesEntity.notifNovedades);
    app.get('/mapi/notificacionesVotacion/:idConsorcio/:codigoUnidad', votacionEntity.notifVotaciones);
    app.get('/mapi/notificacionesGeneralidad/:idConsorcio/:idUsuario', generalidadesEntity.notifGeneralidades);
    app.get('/mapi/notificacionesExpensa/:idConsorcio/:idUsuario', expensaEntity.notifExpensas);
    
    /****ARCHIVOS****/
    app.get('/api/obtenerArchivoById/:id', archivoEntity.obtenerArchivoById);
    app.post('/api/crearArchivos',multipart(), archivoEntity.crearArchivos);
    app.post('/mapi/guardarImagen', upload.single('file'), archivoEntity.guardarImagen);
    app.get('/mapi/obtenerImagen/:idArchivo', upload.single('file'), archivoEntity.obtenerArchivo);

};

var winston = require('../../config/log.js');

winston.level = 'debug';

module.exports = function(socket) {
	socket.on('eNuevoReclamo', function (data) {
		winston.info(data.idConsorcio);

		socket.broadcast.emit('oNuevoReclamo', {idConsorcio: data.idConsorcio});
  	});

  	socket.on('eNuevoMensaje', function (data) {
		winston.info(data.idConsorcio);

		socket.broadcast.emit('oNuevoMensaje', {idConsorcio: data.idConsorcio});
  	});

  	socket.on('eNuevoPago', function (data) {
		winston.info(data.idConsorcio);

		socket.broadcast.emit('oNuevoPago', {idConsorcio: data.idConsorcio});
  	});
}
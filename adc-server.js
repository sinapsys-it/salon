/* 
 * Server.js
 */
// modules =================================================
var busboy			= require('connect-busboy');
var bodyParser     	= require('body-parser');
var path			= require('path');
var methodOverride 	= require('method-override');
var mongoose 		= require('mongoose');
var cors  			= require('cors');
var r				= require('request');
var forEach			= require('async-foreach').forEach;
var express 		= require('express');
var app 			= express();
var server 			= require('http').createServer(app);
var io 				= require('socket.io')(server);
var port 			= process.env.PORT || 9009;
var winston			= require('./config/log.js');


var mongo = {
//		'url' : 'mongodb://192.168.0.69/adminQA'
		'url' : 'mongodb://192.168.0.69/admin'
};

winston.level = 'debug';

//catch the uncaught errors that weren't wrapped in a domain or try catch statement
//do not use this in modules, but only in applications, as otherwise we could have multiple of these bound
//process.on('uncaughtException', function(err) {
//// handle the error safely
// winston.debug("ERROR!!! " + err);
//});

//CONNECTION EVENTS
mongoose.connection.on("disconnected", function(ref) {
	winston.info("Se desconecto!");
	mongoose.connect(mongo.url, {server:{auto_reconnect:true}});
});

mongoose.connection.on('reconnected', function () {
    winston.info("Se reconecto!");
});


//When successfully connected

mongoose.connection.on("connected", function(ref) {
	var numUsers = 0;
	winston.info('Mongoose default connection open to ' + mongo.url);

	// get all data/stuff of the body (POST) parameters
	// parse application/json 
	app.use(bodyParser.json()); 

	app.use(cors());

	// parse application/vnd.api+json as json (More info here: http://jsonapi.org/)
	app.use(bodyParser.json({ type: 'application/vnd.api+json' })); 

	// parse application/x-www-form-urlencoded
	app.use(bodyParser.urlencoded({ extended: true }));

	// override with the X-HTTP-Method-Override header in the request. simulate DELETE/PUT
	app.use(methodOverride('X-HTTP-Method-Override')); 

	// set the static files location /Public/Images will be /Images for users
	app.use(express.static(__dirname + '/public'));

	//Loggear peticiones de la aplicación en la consola
	app.use(function (req, res, next) {
	  winston.debug('Time:', Date.now());
	  next();
	});

	// routes ==================================================
	require('./app/routes')(app); //configure our routes

	server.listen(port, function () {
	  winston.info('Server listening at port %d', port);
	});

	io.on('connection', require('./app/models/socket'));

	// expose app
	exports = module.exports = app;
}); 
	
//connect to our mongoDB database 
mongoose.connect(mongo.url, {server:{auto_reconnect:true}});
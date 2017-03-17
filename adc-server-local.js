/* 
 * Server.js
 */
// modules =================================================
var express        	= require('express');
var app            	= express();
var busboy			= require('connect-busboy');
var bodyParser     	= require('body-parser');
var path			= require('path');
var http			= require('http');
var methodOverride 	= require('method-override');
var mongoose 		= require('mongoose');
var cors  			= require('cors');
var r				= require('request');
var forEach			= require('async-foreach').forEach;
var winston			= require('./config/log.js'); 

//NO CAMBIAR LA URL! SI NECESITAS APUNTAR AL 69...CORRÉ EL OTRO ARCHIVO! (adc-server.js) GRACIAS! =)// 
var mongo = {
		'url' : 'mongodb://127.0.0.1:27017/condominium'
};

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
		 // do logging
	    var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
	    winston.info('REQUEST:' + fullUrl);
	    next(); // make sure we go to the next routes and don't stop here
	});

	// routes ==================================================
	require('./app/routes')(app); //configure our routes

	//start server on the specified port and binding host
	app.listen('9009', function() {

		// print a message when the server starts listening
	  winston.info("server starting on " + '9009');
	});

	// expose app
	exports = module.exports = app;
}); 
	
//connect to our mongoDB database 
mongoose.connect(mongo.url, {server:{auto_reconnect:true}});

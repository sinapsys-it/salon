/* 
 * Server.js
 */
// modules =================================================
var express        	= require('express');
var app            	= express();
var busboy			= require('connect-busboy');
var bodyParser     	= require('body-parser');
var path			= require('path');
var http			= require('http').createServer(app);
var methodOverride 	= require('method-override');
var mongoose 		= require('mongoose');
var cors  			= require('cors');
var r				= require('request');
var forEach			= require('async-foreach').forEach;
var compression 	= require('compression');
var fs = 	require("fs");
var winston			= require('./config/log.js'); 
var io 				= require('socket.io')(http);

// max cache
var cacheExp = 86400000; //one day


//cfenv provides access to your Cloud Foundry environment
//for more info, see: https://www.npmjs.com/package/cfenv
var cfenv = require('cfenv');

//get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();


//mongoose configuration

var options =
{
    db: {safe: true},
    server: {
    	poolSize: 10,
        socketOptions: {
            keepAlive: 1
        },
        auto_reconnect: true
    }
    
};

// configuration ===========================================

//configuracion de base de datos BLUEMIX
if (process.env.VCAP_SERVICES) {
	var env = JSON.parse(process.env.VCAP_SERVICES);
	if (env['mongodb']) {
		var mongo = env['mongodb'][0]['credentials'];
	}
	else if(env["user-provided"]){
		winston.info("Utilizando mongo by compose!");
		var credentials = env["user-provided"][0]['credentials'];
		var mongo = {	
			url: "mongodb://" + credentials.user + ":" + credentials.password + "@" + credentials.uri + ":" + credentials.port + (process.env.QA ? "/condominiumQA" : "/condominium")
		}
	}
	winston.info("Bluemix connection loaded!");
}
else {
	var mongo = {
			'url' : 'mongodb://192.168.0.69:27017/adminQA'
	}

	winston.info("Conectado a rockMongo!");
}

//catch the uncaught errors that weren't wrapped in a domain or try catch statement
//do not use this in modules, but only in applications, as otherwise we could have multiple of these bound
process.on('uncaughtException', function(err) {
 //handle the error safely
 winston.error("ERROR!!! " + err);
 winston.error(err, err.stack.split("\n"));
});

mongoose.connection.on("disconnected", function(ref) {
	winston.info("Se desconecto!");
	mongoose.connect(mongo.url, options);
});

mongoose.connection.on('reconnected', function () {
    winston.info("Se reconecto!");
});

mongoose.connection.on("connected", function(ref) {  
	winston.info('Mongoose connection open to ' + mongo.url);
	
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
	
	//compress
	app.use(compression());
	
	//cache header max age 1 dia por ahora
	
	// set the static files location /Public/Images will be /Images for users
	app.use(express.static(__dirname + '/public', { maxAge: cacheExp }));

	//app.use(multer());
	 
	//Loggear peticiones de la aplicación en la consola
	app.use(function (req, res, next) {
	  winston.debug('Duracion:', new Date().toString()); 
	  next();	
	});
	
	//Express error handling
	app.use(function(err, req, res, next) {
		  winston.error(err.stack);
		  res.status(500).send('Algo anduvo mal..');
	});

	app.get('/content/secure/ppolicy', function(req, res){
		var file = fs.createReadStream('./public/privacy_policy.pdf');
		var stat = fs.statSync('./public/privacy_policy.pdf');
		res.setHeader('Content-Length', stat.size);
		res.setHeader('Content-Type', 'application/pdf');
		res.setHeader('Content-Disposition', 'attachment; filename=privacy_policy.pdf');
		file.pipe(res);
	});
	 
	// routes ==================================================
	require('./app/routes')(app); //configure our routes
	
	//start server on the specified port and binding host
	app.listen(appEnv.port, appEnv.bind, function() {
	
		// print a message when the server starts listening
	  winston.info("server starting on " + appEnv.url);
	});

	//Http listen for SocketIO
	http.listen(appEnv.port, function(){

	});

	io.on('connection', require('./app/models/socket'));
	
	// expose app
	exports = module.exports = app;
});


	
mongoose.set('debug', false);

// connect to our mongoDB database 
// (uncomment after you enter in your own credentials in config/db.js)
mongoose.connect(mongo.url,options); 

mongoose.connection.on('error', function(err) {
    winston.error('Mongo Error:\n');
    winston.error(err);
}).on('open', function() {
    winston.info('Connection opened');
});




module.exports = function(grunt) {
	console.log("I'm in GRUNT");
    //grunt wrapper function 
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        ngAnnotate: {
            options: {
                singleQuotes: true
            },
            app: {
                files: {
                	'./public/min-safe/js/routes.js': ['./app/js/routes.js'],
                  './public/min-safe/js/sha256.js': ['./public/js/sha256.js'],
              		'./public/min-safe/js/appRoutes.js': ['./public/js/appRoutes.js'],
                  './public/min-safe/js/app.js': ['./public/js/app.js'],
                  './public/min-safe/js/controllers/index.js': ['./public/js/controllers/index.js'],
                  './public/min-safe/js/controllers/usuario.js': ['./public/js/controllers/usuario.js'],
                  './public/min-safe/js/controllers/login.js': ['./public/js/controllers/login.js'],
              		'./public/min-safe/js/controllers/mensaje.js': ['./public/js/controllers/mensaje.js'],
              		'./public/min-safe/js/controllers/consorcio.js': ['./public/js/controllers/consorcio.js'],
              		'./public/min-safe/js/controllers/telefono.js': ['./public/js/controllers/telefono.js'],
              		'./public/min-safe/js/controllers/novedad.js': ['./public/js/controllers/novedad.js'],
              		'./public/min-safe/js/controllers/expensa.js': ['./public/js/controllers/expensa.js'],
              		'./public/min-safe/js/controllers/pago.js': ['./public/js/controllers/pago.js'],
              		'./public/min-safe/js/controllers/votacion.js': ['./public/js/controllers/votacion.js'],
              		'./public/min-safe/js/controllers/reclamo.js': ['./public/js/controllers/reclamo.js'],
              		'./public/min-safe/js/controllers/galeriaExpensa.js': ['./public/js/controllers/galeriaExpensa.js'],
              		'./public/min-safe/js/controllers/generalidad.js': ['./public/js/controllers/generalidad.js'],
              		'./public/min-safe/js/controllers/contacto.js': ['./public/js/controllers/contacto.js'],
              		'./public/min-safe/js/controllers/configuracion.js': ['./public/js/controllers/configuracion.js'],
              		'./public/min-safe/js/services/acciona-crypto.js': ['./public/js/services/acciona-crypto.js'],
              		'./public/min-safe/js/services/print.js': ['./public/js/services/print.js'],
                  './public/min-safe/js/services/socket.js': ['./public/js/services/socket.js']
                }
            }
        },
        concat: {
            js: { //target
                src: ['./public/min-safe/js/*.js', './public/min-safe/js/controllers/*.js', './public/min-safe/js/services/*.js'],
                dest: './public/min/app.js'
            }
        },
        uglify: {
            js: {
                src: ['./public/min/app.js'],
                dest: './public/min/app.js'
            }
        }
    });
    
    //load grunt tasks
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-ng-annotate'); 

    //register grunt default task
    grunt.registerTask('default', ['ngAnnotate', 'concat', 'uglify']);
}
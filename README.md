

# Implementación y uso de GRUNT en el proyecto 

###### (Tutorial a la velocidad de la luz. Más info en:  [http://www.sitepoint.com/5-minutes-to-min-safe-angular-code-with-grunt](http://www.sitepoint.com/5-minutes-to-min-safe-angular-code-with-grunt/ "5-minutes-to-min-safe-angular-code-with-grunt") )


> Donde está la magia?

En el package.json:

*   "grunt-cli": "latest", 
*   "grunt-init": "latest", 
*   "grunt": "~0.4.4", 
*   "grunt-contrib-concat": "latest", 
*   "grunt-contrib-uglify": "latest", 
*   "grunt-ng-annotate": "latest"
   
En la raíz del proyecto, un archivo llamado "Gruntfile.js"

El grunt corre cuando se hace un "npm install"

Esto te genera dos carpetas en el directorio "public"
min
min-safe
El js que está dentro de min (app.js), contiene todos los js de la aplicación (controllers y servicios) comprimidos y vas a ver que, en el Index.html se incluye ese solo en esta línea:

<script type="text/javascript" src="./min/app.js?v=1"></script>

Si quisieras agregar mas archivos al "app.js" que contiene a todos, tenes que hacerlo en el "Gruntfile.js" siguiendo el ejemplo de los que ya estan y listo!

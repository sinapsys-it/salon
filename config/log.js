var logger = require('winston');

if (process.env.VCAP_SERVICES) 
{
	logger.level = 'info';
}
else
{
	logger.level = 'debug';
}

module.exports = logger;
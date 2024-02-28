const hostconfig = require('./config.json');

if(hostconfig.theseed_version === undefined)
	hostconfig.theseed_version = process.env.THESEED_VERSION || '4.12.0';

if(hostconfig.host === undefined)
	hostconfig.host = process.env.HOST || '0.0.0.0';

if(hostconfig.port === undefined)
	hostconfig.port = process.env.PORT || '8000';

if(hostconfig.disable_file_server === undefined)
	hostconfig.disable_file_server = !!Number(process.env.DISABLE_FILE_SERVER);

if(hostconfig.database_type === undefined)
	hostconfig.database_type = (process.env.DATABASE_TYPE || '').toLowerCase() || 'sqlite';

module.exports = hostconfig;

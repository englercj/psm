/**
 * psm.js: Include for the Panther Server Manger module
 *
 * (c) 2012 Panther Development
 * MIT LICENCE
 *
 **/

//////////
// Required Includes
///////////////////////////
var fs = require('fs'),
path = require('path'),
events = require('events'),
winston = require('winston'),
utile = require('utile'),
nconf = require('nconf'),
forever = require('forever'),
enode = require('enode'),
cp = require('child_process'),
pkginfo = require('pkginfo'),
Manager = require('./psm/manager').Manager;

//////////
// Setup exports
///////////////////////////
var psm = exports;

//////////
// Setup PSM Components
///////////////////////////
psm.initialized = false;

psm.configFile = path.join(__dirname, '../config/config.json');
psm.serversFile = path.join(__dirname, '../config/servers.json');

psm.config = new nconf.File({ file: psm.configFile });
psm.servers = new nconf.File({ file: psm.serversFile });

psm.config.loadSync();
psm.servers.loadSync();

//change sockets dir if this is windows
if(process.platform === 'win32') {
    psm.config.set('sockets:dir', '\\\\.\\pipe\\');
}

psm.cli = require('./psm/cli');

//////////
// Setup winston
///////////////////////////
var logLevels = {
    levels: {
	silly: 0,
	debug: 1,
	verbose: 2,
	info: 3,
	warn: 4,
	error: 5,
	silent: 6
    },
    colors: {
	silly: 'grey',
	debug: 'green',
	verbose: 'magenta',
	info: 'cyan',
	warn: 'yellow',
	error: 'red'
    }
};

winston.addColors(logLevels.colors);

//Setup winston loggers
psm._console = new winston.Logger({
    level: psm.config.get('logging:level'),
    levels: logLevels.levels,
    handleExceptions: false,
    transports: [
	new winston.transports.Console({
	    level: psm.config.get('logging:level'),
	    levels: logLevels.levels,
	    handleExceptions: false,
	    colorize: true
	})
    ]
});
psm._console.cli();

psm._file = new winston.Logger({
    level: psm.config.get('logging:level'),
    levels: logLevels.levels,
    transports: [
	new winston.transports.File({
	    level: psm.config.get('logging:level'),
	    levels: logLevels.levels,
	    filename: path.join(psm.config.get('logging:dir'), 'psm.log'),
	    timestamp: true,
	    colorize: true
	})
    ]
});

//wrap loggers into my own object, so I can keep them seperate
//but sitll call both via a single function
psm.log = {
    log: function() {
	if(psm._console) psm._console.log.apply(psm._console, arguments);
	if(psm._file) psm._file.log.apply(psm._file, arguments);
    }
};
utile.each(logLevels.levels, function(val, level, o) {
    psm.log[level] = function() {
	if(psm._console) psm._console[level].apply(psm._console, arguments);
	if(psm._file) psm._file[level].apply(psm._file, arguments);
    }
});

//////////
// Setup PkgInfo Version
///////////////////////////
require('pkginfo')(module, 'version');

//////////
// Setup Manager
///////////////////////////
psm.getManager = function(cb) {
    var sock, f, p = psm.config.get('sockets:manager');

    try {
	f = fs.lstatSync(p);
	sock = f.isSocket();
    } catch(e) {}

    if(sock) {
	var client = new enode.Client().connect(p, function(err, man, connection) {
	    cb(err, man);
	});
    } else {
	if(cb) cb(new Error('Manager socket file not found'), null);
    }
}

//TODO: Defaults for config
/*
psm.load = function() {
    if(psm.initialized) return;

    var config;

    try {
	config = psm.config.loadSync();
    } catch(e) {
	psm.error('Unable to load log file!', e);
	return false;
    }

    //ensure we have the minimun config
    options = options || {};

    //Setup default options
    options = {
	cli: { logLevel: 'info', prompt: '> ' },
	api: { enabled: true, host: '127.0.0.1', port: 8596 },
	debug: false
    };

    

    //Ensure Update config and save
    psm.config.set('cli', config.cli);
    psm.config.set('api', config.api);
    psm.config.set('debug', config.debug);

    psm.config.save();
};
*/
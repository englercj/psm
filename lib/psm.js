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
winston = require('winston'),
utile = require('utile'),
pkginfo = require('pkginfo'),
request = require('request'),
mongoose = require('mongoose'),
config = require('yaml-config');
schemas = require('./psm/models'),
Manager = require('./psm/manager').Manager;

//////////
// Setup exports
///////////////////////////
var psm = exports;

/////////
// Load configuration
///////////////////////////
psm.config = config.readConfig(path.join(__dirname, '../config/config.yml'));
psm.database = config.readConfig(path.join(__dirname, '../config/database.yml'));

/////////
// Open MongoDB connection
///////////////////////////
schemas.UserSchema.plugin(mongooseAuth, {
    everymodule: {
	everyauth: {
	    User: function() {
		return User;
	    }
	}
    },
    password: {
	everyauth: {
	    getLoginPath: '/login',
	    postLoginPath: '/login'
	}
    }
});

mongoose.model('User', schemas.UserSchema);

psm.db = mongoose.connect(psm.database.host, psm.database.database, psm.database.port);
psm.db.on('error', function(err) {
    psm.log.error('Could not connect to MongoDB.', err);
});

//////////
// Setup PSM Components
///////////////////////////
//change sockets dir if this is windows
if(process.platform === 'win32') {
    psm.config.sockets.dir = '\\\\.\\pipe\\';
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
    level: psm.config.logging.level,
    levels: logLevels.levels,
    handleExceptions: false,
    transports: [
	new winston.transports.Console({
	    level: psm.config.logging.level,
	    levels: logLevels.levels,
	    handleExceptions: false,
	    colorize: true
	})
    ]
});
psm._console.cli();

psm._file = new winston.Logger({
    level: psm.config.logging.level,
    levels: logLevels.levels,
    transports: [
	new winston.transports.File({
	    level: psm.config.logging.level,
	    levels: logLevels.levels,
	    filename: path.join(psm.config.logging.dir, 'psm.log'),
	    timestamp: true,
	    colorize: true
	})
    ]
});

//wrap loggers into my own object, so I can keep them seperate
//but still call both via a single function
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
psm.manager = {
    cmd: function(cmd, server, remote, cb) {
	var url = 'http://localhost:' + psm.config.api.port;
	url += '/' + cmd + '/' + server + (remote ? '/' + remote : '');
	
	//TODO: if add command then its a post...
	request(url, function(err, res, body) {
	    if(!err && res.statusCode == 200) {
		var json;
		try {
		    json = JSON.parse(body);

		    if(json.error) {
			cb(new Error(json.error), json);
		    } else {
			cb(null, json);
		    }
		} catch(e) {
		    cb(e, body);
		}
	    } else {
		//if no error, then send a non-200 error, also send the
		//response for debugging if necessary
		cb((err ? 
		    err 
		    : 
		    new Error('Non 200 response code received.')
		   ), res);
	    }
	});
    }
};
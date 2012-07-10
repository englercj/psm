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
lumber = require('lumber'),
//winston = require('winston'),
utile = require('utile'),
pkginfo = require('pkginfo'),
request = require('request'),
mongoose = require('mongoose'),
mongooseAuth = require('mongoose-auth'),
yaml = require('js-yaml'),
schemas = require('./psm/models'),
Manager = require('./psm/manager').Manager,
Config = mongoose.model('Config');

//////////
// Setup exports
///////////////////////////
var psm = exports;

/////////
// Load db configuration
///////////////////////////
psm.database = require(path.join(__dirname, '../config/database.yml')).shift().mongodb;

/////////
// Helper Utils
///////////////////////////
psm.generateGuid = function() {
    var S4 = function () {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    };

    return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
};

/////////
// Open MongoDB connection
///////////////////////////
psm.db = mongoose.connect(psm.database.uri);
psm.db.connection.on('error', function(err) {
    console.log('Could not connect to MongoDB.', err);
    process.exit(1);
});

/////////
// Initialize
///////////////////////////
psm.init = function(cb) {
    Config.findOne({}, function (err, doc) {
        if(err) {
            if(cb) cb(err);
            return;
        }

        if(doc === null) {
            //insert default
            var cfg = new Config({
                token: psm.generateGuid()
            });
            cfg.save(function(err, def) {
                if(err) {
                    if(cb) cb(err);
                    return;
                }

                psm.config = def._doc;

		if(typeof(psm.config.api.port) != 'number')
		    psm.config.api.port = parseInt(psm.config.api.port, 10);

                console.log('AUTH TOKEN:', psm.config.token);
                psm._init(cb);
            });
        } else {
            psm.config = doc._doc;

	    if(typeof(psm.config.api.port) != 'number')
		psm.config.api.port = parseInt(psm.config.api.port, 10);

            console.log('AUTH TOKEN:', psm.config.token);
            psm._init(cb);
        }
    });
};

psm._init = function(cb) {
    psm._configLogger();
    psm._configCli();
    psm._configSockets();
    psm._configPackage();
    psm._configManager();

    cb(null);
};

psm._configSockets = function() {
    //change sockets dir if this is windows
    if(process.platform === 'win32') {
        psm.config.sockets.dir = '\\\\.\\pipe\\';
    }
};

psm._configCli = function() {
    psm.cli = require('./psm/cli');
};

psm._configLogger = function() {
    psm.log = new lumber.Logger({
        levels: {
            silent: -1,
            error: 0,
            warn: 1,
            info: 2,
            verbose: 3,
            debug: 4,
            silly: 5
        },
        colors: {
            error: 'red',
            warn: 'yellow',
            info: 'cyan',
            verbose: 'magenta',
            debug: 'green',
            silly: 'rainbow'
        },
        transports: [
            new lumber.transports.File(psm.config.logging.file),
            new lumber.transports.Console(psm.config.logging.cli)
        ]
    });
};

psm._configPackage = function() {
    require('pkginfo')(module, 'version');
};

psm._configManager = function() {
    psm.manager = {
        cmd: function(cmd, server, remote, cb) {
            if(typeof(remote) == 'function') {
                cb = remote;
                remote = null;
            }

            var url = 'http://localhost:' + psm.config.api.port +
                '/' + cmd +
                (server ?
                 '/' + server :
                 '' + (remote ? '/' + remote : '')
                ) +
		'?token=' + psm.config.token;

            //TODO: if add command then its a post...
            request(url, function(err, res, body) {
                if(!err && res.statusCode == 200) {
                    var json;
                    try {
                        json = JSON.parse(body);

                        if(!json.success) {
                            console.log(json.error);
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
};

//Modified from jQuery Core
psm.proxy = function(fn, context) {
    var tmp, args, proxy;

    if (typeof context === "string") {
        tmp = fn[context];
        context = fn;
        fn = tmp;
    }

    if (typeof(fn) != 'function') {
        return undefined;
    }

    args = Array.prototype.slice.call(arguments, 2);

    proxy = function () {
        return fn.apply(context, args.concat(Array.prototype.slice.call(arguments)));
    };

    proxy.guid = fn.guid = fn.guid || proxy.guid || psm.guid();

    return proxy;
}

psm.guid = function() {
    var S4 = function () {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    };
    
    return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
}
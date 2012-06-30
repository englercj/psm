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
Manager = require('./psm/manager').Manager;

//////////
// Setup exports
///////////////////////////
var psm = exports;

/////////
// Load configuration
///////////////////////////
psm.config = require(path.join(__dirname, '../config/config.yml')).shift();
psm.database = require(path.join(__dirname, '../config/database.yml')).shift().mongodb;

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
            postLoginPath: '/login',
            getRegisterPath: '/register',
            postRegisterPath: '/register'
        }
    }
});

mongoose.model('User', schemas.UserSchema);

psm.db = mongoose.connect(psm.database.uri);
psm.db.connection.on('error', function(err) {
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
// Setup lumber
///////////////////////////
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

/*
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
  silly: 'rainbow',
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
*/
//////////
// Setup PkgInfo Version
///////////////////////////
require('pkginfo')(module, 'version');

//////////
// Manager Wrapper
///////////////////////////
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
            );

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
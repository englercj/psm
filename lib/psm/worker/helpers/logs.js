var utile = require('utile'),
events = require('events'),
async = utile.async,
fs = require('fs'),
path = require('path');

var LogManager = exports.LogManager = function(options) {
    var self = this;
    events.EventEmitter.call(self);
    options = options || {};

    self.log = options.logger;
    self.worker = options.worker;
    self.server = options.server;

    self.paths = options.server.paths;

    self._defineGetters();
    self._defineSetters();

    self._bufferMax = 200;
    self._outputBuffer = [];
    self._chatBuffer = [];

    self.worker.outputs.on('output', function(str) {
	self._outputBuffer = self._outputBuffer.concat(str);

	if(self._outputBuffer.length > self._bufferMax)
	    self._outputBuffer.unshift();
    });

    self.worker.outputs.on('player::chat', function(time, player, msg) {
	self._chatBuffer.push({
	    timestamp: time,
	    player: player,
	    message: msg
	});

	if(self._chatBuffer.length > self._bufferMax)
	    self._chatBuffer.unshift();
    });
};

utile.inherits(LogManager, events.EventEmitter);

LogManager.prototype.backup = function(cb) {
    /*
    var self = this;

    if(self.worker.isRunning()) {
        self.worker.stop(function(err) {
            if(err) {
                self.log.error('Unable to stop server for log backups', err);
                if(cb) cb(err);
                return;
            }
	    
            self._doLogBackup(cb);
        });
    } else {
        self._doLogBackup(cb);
    }
    */

    var self = this,
    logP = self.paths.log,
    bak = self.backup.logs.path,
    fname = self.worker.files._datePath(path.join(bak, 'serverlog_'), '.log');

    self.log.info('Backing up server.log to ' + fname + '...');

    utile.mkdirp(bak, function(err) {
        if(err) { if(cb) cb(err); return; }

        fs.rename(logP, fname, function(err) {
            if(err) {
                if(err.code == 'ENOENT') {
                    self.log.info('No server.log to backup.');
                }

                //self.worker.start(function() {
                    if(cb) cb(err);
                //});
                return;
            }

            self.log.info('Gzipping backed up logfile...');
            cp.exec('gzip ' + fname, function(err, stdout, stderr) {
                if(err) {
                    self.log.error('Error gzippping backup logfile ' + fname, err);
                }

                //self.worker.start(function() {
                    if(cb) cb(err);
		//});
            });
        });
    });
};

LogManager.prototype.restore = function(file, cb) {
    var self = this;
};

LogManager.prototype.get = function(cb) {
    var self = this;

    self.worker.files.read(self.paths.log, cb);
};

//Pull tails out of an in-memory buffer of previous lines
LogManager.prototype.tail = function(limit, cb) {
    var self = this,
    lines = self._outputBuffer;

    if(typeof(limit) == 'function') {
	cb = limit;
	limit = 0;
    }

    cb(null, (limit ? lines.slice(line.length - limit) : lines));
};

LogManager.prototype.tailChats = function(limit, player, cb) {
    var self = this,
    chats = self._chatBuffer;

    if(typeof(player) == 'function') {
	cb = player;
	player = null;
    }

    if(typeof(limit) == 'function') {
	cb = limit;
	limit = 0;
    }

    //filter based on player if passed
    if(player) {
	chats = chats.filter(function(chat) {
	    return chat.player == player;
	});
    }

    //limit if we have one
    cb(null, (limit ? chats.slice(chats.length - limit) : chats));
};
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
    self.files = options.worker.files;

    self._defineGetters();
    self._defineSetters();

    self._setupBackupCrons();
};

utile.inherits(LogManager, events.EventEmitter);

LogManager.prototype.backup = function(cb) {
    var self = this;
};

LogManager.prototype.restore = function(cb) {
    var self = this;
};

LogManager.prototype.get = function(cb) {
    var self = this;

    self.files.read(self.paths.log, cb);
};

LogManager.prototype.tail = function(limit, cb) {
    var self = this;
    
    self.get(function(err, str) {
	var lines = str.split('\n');

	limit = limit || lines.length;

	cb(err, (limit ? lines.slice(line.length - limit) : lines));
    });
};


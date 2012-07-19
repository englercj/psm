var utile = require('utile'),
events = require('events'),
cp = require('child_process'),
path = require('path'),
request = require('request'),
Job = require('./job').Job;

var WorldManager = exports.WorldManager = function(options) {
    var self = this;
    events.EventEmitter.call(self);
    options = options || {};

    self.log = options.logger;
    self.worker = options.worker;
    self.server = options.server;

    self.outputs = options.worker.outputs;
    self.files = options.worker.files;

    self._defineGetters();
    self._defineSetters();
};

utile.inherits(WorldManager, events.EventEmitter);

WorldManager.prototype.get = function(world, cb) {
    var self = this;
};

WorldManager.prototype.backup = function(world, cb) {
    var self = this;
};

WorldManager.prototype.restore = function(world, time, cb) {
    var self = this;
};

WorldManager.prototype._defineGetters = function() {
    var self = this;

    //self.__defineGetter__('something', function() {});
};

WorldManager.prototype._defineSetters = function() {
    var self = this;

    //self.__defineSetter__('something', function(val) {});
};

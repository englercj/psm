var utile = require('utile'),
events = require('events'),
cp = require('child_process'),
path = require('path'),
request = require('request');

var JobManager = exports.JobManager = function(options) {
    var self = this;
    events.EventEmitter.call(self);
    options = options || {};

    self.log = options.logger;
    self.worker = options.worker;
    self.server = options.server;

    self._defineGetters();
    self._defineSetters();
};

utile.inherits(JobManager, events.EventEmitter);

JobManager.prototype.add = function(job, cb) {
    var self = this;
};

JobManager.prototype.remove = function(job, cb) {
    var self = this;
};

JobManager.prototype.get = function(cb) {
    var self = this;
};

JobManager.prototype.getRunning = function(cb) {
    var self = this;
};

JobManager.prototype.run = function(job, cb) {
    var self = this;
};

JobManager.prototype._defineGetters = function(cb) {
    var self = this;

    //self.__defineGetter__('something', function() {});
};

JobManager.prototype._defineSetters = function(cb) {
    var self = this;

    //self.__defineSetter__('something', function(val) {});
};

var cp = require('child_process'),
util = require('util'),
path = require('path'),
events = require('events');

var SystemManager = exports.SystemManager = function(options) {
    var self = this;
    events.EventEmitter.call(self);
    options = options || {};

    self.log = options.logger;
    self.worker = options.worker;
    self.server = options.server;

    self._defineGetters();
    self._defineSetters();
};

util.inherits(SystemManager, events.EventEmitter);

SystemManager.prototype.forceStop = function(cb) {
    var self = this;
};

SystemManager.prototype.forceRestart = function(cb) {
    var self = this;
};

SystemManager.prototype.getJavaVersion = function(cb) {
    var self = this;
};

SystemManager.prototype.disableWhitelist = function(cb) {
    var self = this;
};

SystemManager.prototype.enableWhitelist = function(cb) {
    var self = this;
};

SystemManager.prototype.getWhitelist = function(cb) {
    var self = this;
};

SystemManager.prototype.getBanned = function(cb) {
    var self = this;
};

SystemManager.prototype.saveMap = function(cb) {
    var self = this;
};

SystemManager.prototype.setGameMode = function(cb) {
    var self = this;
};

SystemManager.prototype.getJavaMemMax = function(cb) {
    var self = this;
};

SystemManager.prototype.getJavaMemUsage = function(cb) {
    var self = this;
};

SystemManager.prototype.backup = function(cb) {
    var self = this;
};

SystemManager.prototype.restore = function(cb) {
    var self = this;
};

SystemManager.prototype._defineGetters = function() {
    var self = this;

    //self.__defineGetter__('something', function() {});
};

SystemManager.prototype._defineSetters = function() {
    var self = this;

    //self.__defineSetter__('something', function(val) {});
};

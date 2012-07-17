var utile = require('utile'),
events = require('events'),
cp = require('child_process'),
path = require('path'),
request = require('request');

var PlayerManager = exports.PlayerManager = function(options) {
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

utile.inherits(PlayerManager, events.EventEmitter);

PlayerManager.prototype.getOps = function(cb) {
    var self = this;
};

PlayerManager.prototype.getWhitelist = function(cb) {
    var self = this;
};

PlayerManager.prototype.getBanned = function(cb) {
    var self = this;
};

PlayerManager.prototype.getConnected = function(cb) {
    var self = this;
};

PlayerManager.prototype.getInfo = function(player, cb) {
    var self = this;
};

PlayerManager.prototype.kill = function(player, cb) {
    var self = this;
};

PlayerManager.prototype.setHealth = function(player, cb) {
    var self = this;
};

PlayerManager.prototype.setFood = function(player, food, cb) {
    var self = this;
};

PlayerManager.prototype.kick = function(player, cb) {
    var self = this;
};

PlayerManager.prototype.ban = function(player, cb) {
    var self = this;
};

PlayerManager.prototype.unban = function(player, cb) {
    var self = this;
};

PlayerManager.prototype.addToWhitelist = function(player, cb) {
    var self = this;
};

PlayerManager.prototype.removeFromWhitelist = function(player, cb) {
    var self = this;
};

PlayerManager.prototype.op = function(player, cb) {
    var self = this;
};

PlayerManager.prototype.deop = function(player, cb) {
    var self = this;
};

PlayerManager.prototype.getInventory = function(player, cb) {
    var self = this;
};

PlayerManager.prototype.clearInventorySlot = function(player, slot, cb) {
    var self = this;
};

PluginManager.prototype._defineGetters = function() {
    var self = this;

    //self.__defineGetter__('something', function() {});
};

PluginManager.prototype._defineSetters = function() {
    var self = this;

    //self.__defineSetter__('something', function(val) {});
};

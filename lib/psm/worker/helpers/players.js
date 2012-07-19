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

    self._defineGetters();
    self._defineSetters();

    self._players = [];

    self.worker.outputs.on('player::connect', function(time, player) {
        if(self._findPlayerIndex(player.name) === -1) {
	    self._players.push(player);
	}
    });

    self.worker.outputs.on('player::disconnect', function(time, player) {
	self._removePlayer(player);
    });
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
    var self = this,
    i = self._findPlayerIndex(player);

    if(i > -1)
	cb(null, self._players[i]);
    else
	cb(new Error('Player not connected.'));
};

PlayerManager.prototype.getInventory = function(player, cb) {
    var self = this;
};

PlayerManager.prototype.clearInventorySlot = function(player, slot, cb) {
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

PlayerManager.prototype._removePlayer = function(name) {
    var self = this, i = self._findPlayerIndex(name);

    if(i > -1) {
        self._players.splice(i, 1);
        return true;
    } else {
        return false;
    }
};

PlayerManager.prototype._findPlayerIndex = function(name) {
    var self = this, indx = -1;

    for(var i = 0, len = self._players.length; i < len; ++i) {
        if(self._players[i].name == name) {
            indx = i;
            break;
        }
    }

    return indx;
};

PluginManager.prototype._defineGetters = function() {
    var self = this;

    //self.__defineGetter__('something', function() {});
};

PluginManager.prototype._defineSetters = function() {
    var self = this;

    //self.__defineSetter__('something', function(val) {});
};

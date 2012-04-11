/**
 * Minecraft bukkit server class for controlling minecraft bukkit servers
**/
var Minecraft = require('./minecraft').Minecraft,
util = require('util');

var Craftbukkit = exports.Craftbukkit = function(options) {
    var self = this;
    Minecraft.call(self, options);
};

//Bukkit inherits from Minecraft class
util.inherits(Craftbukkit, Minecraft);

//Uncomment to override:
//Craftbukkit.prototype.isRunning = function() {};
//Craftbukkit.prototype.start = function() {};
//Craftbukkit.prototype.stop = function() {};
//Craftbukkit.prototype.restart = function() {};
//Craftbukkit.prototype.cmd = function() {};
//Craftbukkit.prototype.status = function(emit) {};

Craftbukkit.prototype.update = function() {};
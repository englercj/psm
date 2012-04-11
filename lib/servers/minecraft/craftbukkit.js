/**
 * Minecraft bukkit server class for controlling minecraft bukkit servers
**/
var Minecraft = require('./minecraft').Minecraft,
util = require('util');

var Craftbukkit = exports.Bukkit = function(options) {
    var self = this;
    Minecraft.call(self, options);
};

//Bukkit inherits from Minecraft class
util.inherits(Bukkit, Minecraft);

//Uncomment to override:
//Bukkit.prototype.isRunning = function() {};
//Bukkit.prototype.start = function() {};
//Bukkit.prototype.stop = function() {};
//Bukkit.prototype.restart = function() {};
//Bukkit.prototype.cmd = function() {};
//Bukkit.prototype.status = function(emit) {};

Bukkit.prototype.update = function() {};
/**
 * Minecraft bukkit server class for controlling minecraft bukkit servers
**/
var Minecraft = require('./minecraft').Minecraft,
util = require('util');

var Bukkit = exports.Bukkit = function(options) {

};

//Bukkit inherits from Minecraft class
util.inherits(Bukkit, Minecraft);
Bukkit.prototype.start = function() {};
Bukkit.prototype.stop = function() {};
Bukkit.prototype.restart = function() {};
Bukkit.prototype.status = function() {};
Bukkit.prototype.update = function() {};
Bukkit.prototype.runCmd = function() {}
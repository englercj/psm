/**
 * Minecraft bukkit server class for controlling minecraft bukkit servers
**/
var Minecraft = require('./minecraft').Minecraft,
util = require('util');

var Bukkit = exports.Bukkit = function(options) {};

//Bukkit inherits from Minecraft class
util.inherits(Bukkit, Minecraft);

//Uncomment to override:
//Bukkit.prototype.start = function() {};
//Bukkit.prototype.stop = function() {};
//Bukkit.prototype.restart = function() {};
//Bukkit.prototype.runCmd = function() {}
//Bukkit.prototype.onStdout = function(data) {};
//Bukkit.prototype.onStderr = function(data) {};
//Bukkit.prototype.onExit = function(code) {};

Bukkit.prototype.status = function() {};
Bukkit.prototype.update = function() {};
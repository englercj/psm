/**
 * Minecraft server class for controlling minecraft servers
**/
var Server = require('../server').Server,
util = require('util');

var Minecraft = exports.Minecraft = function(options) {

};

//Minecraft inherits from Server class
util.inherits(Minecraft, Server);
Minecraft.prototype.start = function() {};
Minecraft.prototype.stop = function() {};
Minecraft.prototype.restart = function() {};
Minecraft.prototype.status = function() {};
Minecraft.prototype.update = function() {};
Minecraft.prototype.runCmd = function() {}
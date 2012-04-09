/**
 * Minecraft tekkit server class for controlling minecraft tekkit servers
**/
var Minecraft = require('./minecraft').Minecraft,
util = require('util');

var Tekkit = exports.Tekkit = function(options) {

};

//Tekkit inherits from Minecraft class
util.inherits(Tekkit, Minecraft);
Tekkit.prototype.start = function() {};
Tekkit.prototype.stop = function() {};
Tekkit.prototype.restart = function() {};
Tekkit.prototype.status = function() {};
Tekkit.prototype.update = function() {};
Tekkit.prototype.runCmd = function() {}
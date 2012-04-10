/**
 * Minecraft tekkit server class for controlling minecraft tekkit servers
**/
var Minecraft = require('./minecraft').Minecraft,
util = require('util');

var Tekkit = exports.Tekkit = function(options) {
    Minecraft.call(this, options);
};

//Tekkit inherits from Minecraft class
util.inherits(Tekkit, Minecraft);

//Uncomment to override:
//Tekkit.prototype.start = function() {};
//Tekkit.prototype.stop = function() {};
//Tekkit.prototype.restart = function() {};
//Tekkit.prototype.runCmd = function() {};

Tekkit.prototype.status = function() {};
Tekkit.prototype.update = function() {};
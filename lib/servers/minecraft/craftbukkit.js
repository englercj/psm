/**
 * Minecraft bukkit server class for controlling minecraft bukkit servers
**/
var Minecraft = require('./minecraft').Minecraft,
util = require('util');
//log = require('../../logger').log;

var Craftbukkit = exports.Craftbukkit = function(options, logger) {
    var self = this;
    Minecraft.apply(self, arguments);
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

Craftbukkit.prototype.update = function(emit) {
    var self = this;

    self._updateFile(
        'craftbukkit.jar',
	'http://dl.bukkit.org/latest-rb/craftbukkit.jar', //Latest RB
	//'http://dl.bukkit.org/latest-dev/craftbukkit.jar', //Latest Dev
        function(err) {
            switch(err) {
            case 'ERUNNING':
                self._logger.log('Cannot update server while it is running', 'info');
		break;
            case 'ESAME':
                self._logger.log('You are already running the latest Craftbukkit version', 'info');
		break;
            case 'EDOWNLOAD':
                self._logger.log('There was an error downloading the Craftbukkit update', 'error');
		break;
            default:
                self._logger.log('Minecraft Server successfully updated', 'info');
            }
	    Minecraft.prototype.update.call(self, emit);
        }
    );
};
/**
 * Server module, base server class that all servers inherit
**/

var Server = exports.Server = function(options) {
    var self = this;

    //initialize
};

//Public abstract methods
Server.prototype.start = function() {};
Server.prototype.stop = function() {};
Server.prototype.restart = function() {};
Server.prototype.status = function() {};
Server.prototype.update = function() {};
Server.prototype.runCmd = function() {}
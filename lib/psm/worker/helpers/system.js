var cp = require('child_process'),
util = require('util'),
path = require('path'),
events = require('events');

var SystemManager = exports.SystemManager = function(options) {
    var self = this;
    events.EventEmitter.call(self);
    options = options || {};

    self.log = options.logger;
    self.worker = options.worker;
    self.server = options.server;

    self._defineGetters();
    self._defineSetters();
};

util.inherits(SystemManager, events.EventEmitter);

SystemManager.prototype.forceStop = function(cb) {
    var self = this;
};

SystemManager.prototype.forceRestart = function(cb) {
    var self = this;
};

SystemManager.prototype.disableWhitelist = function(cb) {
    var self = this;
};

SystemManager.prototype.enableWhitelist = function(cb) {
    var self = this;
};

SystemManager.prototype.getWhitelist = function(cb) {
    var self = this;
};

SystemManager.prototype.getBanned = function(cb) {
    var self = this;
};

SystemManager.prototype.getUptime = function(cb) {
    var self = this;
};

SystemManager.prototype.saveMap = function(cb) {
    var self = this;
};

SystemManager.prototype.setGameMode = function(cb) {
    var self = this;
};

SystemManager.prototype.getJavaMemMax = function(cb) {
    var self = this;
};

SystemManager.prototype.getJavaMemUsage = function(cb) {
    var self = this;
};

SystemManager.prototype.getJavaVersion = function(cb) {
    var self = this;
};

SystemManager.prototype.backup = function(cb) {
    var self = this,
    bin = self.paths.bin,
    bak = self.backup.server.path,
    dname = self.worker.files._datePath(path.join(bak, 'server_'));

    self.log.info('Backing up server bin to ' + dname);

    utile.mkdirp(dname, function(err) {
        if(err) { if(cb) cb(err); return; }

        utile.cpr(bin, dname, function(err) {
            if(err) { if(cb) cb(err); return; }

            if(cb) cb(null);
        });
    });
};

SystemManager.prototype.restore = function(cb) {
    var self = this;
};

SystemManager.prototype.update = function(cb) {
    var self = this,
    errors = [];

    async.parallel({
	Minecraft: function(next) {
	    self.files._updateFile(
		'minecraft_server.jar',
		'https://s3.amazonaws.com/MinecraftDownload/launcher/minecraft_server.jar',
		next
	    );
	},
	Craftbukkit: function(next) {
	    self.files._updateFile(
		'craftbukkit.jar',
		'http://dl.bukkit.org/latest-rb/craftbukkit.jar', //Latest RB
		//'http://dl.bukkit.org/latest-dev/craftbukkit.jar', //Latest Dev
		next
	    );
	}
    }, function(err, results) {
	if(err) errors.push(err);

	if(results) { //then both completed
	    utile.each(results, function(updated, name) {
		if(updated) {
		    self.log.info(name + ' successfully updated.');
		} else {
		    self.log.info(name + ' is already at the latest version.');
		}
	    });

	    if(cb) cb(errors.length ? errors : null);
	}
    });
};

SystemManager.prototype._defineGetters = function() {
    var self = this;

    //self.__defineGetter__('something', function() {});
};

SystemManager.prototype._defineSetters = function() {
    var self = this;

    //self.__defineSetter__('something', function(val) {});
};

var utile = require('utile'),
events = require('events'),
path = require('path'),
request = require('request');

var PluginManager = exports.PluginManager = function(options) {
    var self = this;
    events.EventEmitter.call(self);
    options = options || {};

    self.log = options.logger;
    self.worker = options.worker;
    self.server = options.server;

    self._defineGetters();
    self._defineSetters();
};

utile.inherits(PluginManager, events.EventEmitter);

PluginManager.prototype.get = function(cb) {
    var self = this;
};

PluginManager.prototype.getRunning = function(cb) {
    //TODO: Buffer this on plugin startup, and on reload
    //I don't think it can change in between...

    //use command "plugins" to get plugin list
    var self = this,
    timeout = setTimeout(pluginsGetTimeout, 2500),
    parser = self.worker.outputs._addParser(function(str) {
	var parts = str.match(/^$/);

	if(parts) {
	    //0 = entire message
	    //1 = timestamp
	    //2 = ...
	    clearTimeout(timeout);
	    self.worker.outputs._removeParser(parser);
	    if(cb) cb(null, {
		timestamp: parts[1],
		plugins: parts.slice(2)
	    });
	}
    });

    //fire off the 'plugins' command
    self.worker.cmd('plugins');

    function pluginsGetTimeout() {
	self.worker.outputs._removeParser(parser);
	if(cb) cb(new Error('Command timed out.'));
    }
};

PluginManager.prototype.install = function(jar, cb) {
    var self = this;
};

PluginManager.prototype.installFromUrl = function(url, cb) {
    var self = this;
};

PluginManager.prototype.remove = function(plugin, rmDir, cb) {
    var self = this;

    if(typeof(rmDir) == 'function') {
	cb = rmDir;
	rmDir = false;
    }
};

PluginManager.prototype.disable = function(plugin, cb) {
    var self = this;
};

PluginManager.prototype.enable = function(plugin, cb) {
    var self = this;
};

PluginManager.prototype.info = function(plugin, cb) {
    var self = this;
    //http://bukget.org/api/plugin/<name>
};

PluginManager.prototype.getDisabled = function(cb) {
    var self = this;
};

PluginManager.prototype.reload = function(cb) {
    var self = this;

    //reloads plugins via the 'reload' command
};

PluginManager.prototype.update = function(plugin, force, cb) {
    var self = this;

    if(typeof(force) == 'function') {
	cb = force;
	force = false;
    }

    self.checkUpdates(plugin, function(err, result) {
	if(result.upToDate && !force) {
	    if(cb) cb(null, result);
	    return;
	}

	self.remove(plugin, function(err) {
	    if(err) { if(cb) cb(err); return; }

	    self.installFromUrl(result.newVersion.dl_link, function(err) {
		if(err) { if(cb) cb(err); return; }

		if(cb) cb();
	    });
	});
    });
};

PluginManager.prototype.checkUpdates = function(plugin, cb) {
    var self = this;

    try {
	self._findPlugin(plugin, function(err, data) {
	    if(err) { if(cb) cb(err); return; }

	    //if no data, then not on bukget
	    if(!data) {
		if(cb) cb(new Error('Plugin is not on Bukkit Dev'));
		return;
	    }

	    //check if md5 matches latest version
	    var md5 = self.worker.files.md5File(/* file path */).toLowerCase(),
	    latestMd5 = data.versions[0].md5.toLowerCase(),
	    ver = self._findVersionByMd5(md5, data.versions),
	    obj = {
		upToDate: md5 == latestMd5,
		oldVersion: ver,
		newVersion: data.versions[0]
	    };

	    if(cb) cb(null, obj);
	});
    } catch(e) {
	if(cb) cb(e);
    }
};

PluginManager.prototype._findVersionByMd5 = function(md5, versions) {
    var match;

    for(var i = 0, len = versions.length; i < len; ++i) {
	if(md5 == versions[i].md5) {
	    match = versions[i];
	    break;
	}
    }

    return match;
};

PluginManager.prototype._findPlugin = function(plugin, cb) {
    try {
	request('http://bukget.org/api/plugin/' + plugin, function(err, res, body) {
	    if(err) { if(cb) cb(err); return; }

	    if(res.statusCode == 200 && body) {
		if(cb) cb(null, JSON.parse(body));
	    }

	    if(cb) cb();
	});
    } catch(e) {
	if(cb) cb(e);
    }	
};

PluginManager.prototype._defineGetters = function() {
    var self = this;

    //self.__defineGetter__('something', function() {});
};

PluginManager.prototype._defineSetters = function() {
    var self = this;

    //self.__defineSetter__('something', function(val) {});
};

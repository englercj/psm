var mongoose = require('mongoose'),
mongooseAuth = require('mongoose-auth'),
Schema = mongoose.Schema,
ObjectId = Schema.ObjectId;

//Server Model
var ServerSchema = exports.ServerSchema = new Schema({
    name: { type: String, index: { unique: true } },
    title: String,
    autoStart: Boolean,
    paths: {
	bin: String,
	logs: String,
	worldRam: String,
	worldDisk: String
    },
    backups: {
	server: {
	    path: String,
	    interval: String,
	    enabled: Boolean
	},
	maps: {
	    path: String,
	    interval: String,
	    enabled: Boolean
	},
	logs: {
	    path: String,
	    interval: String,
	    enabled: Boolean
	}
    },
    startup: {
	jar: String,
	initMem: String,
	maxMem: String,
	cpus: Number,
	extraArgs: { 
	    type: Array, default: [
		'-XX:+UseConcMarkSweepGC', '-XX:+CMSIncrementalPacing', '-XX:+AggressiveOpts'
	    ]
	}
    },
    idleTime: Number,
    worlds: { type: [String], default: ['world', 'world_nether', 'world_the_end'] },
    ramWorlds: { type: [String], default: ['world'] }
});

mongoose.model('Server', ServerSchema);

//Remote Model
var RemoteSchema = exports.RemoteSchema = new Schema({
    uri: { type: String, match: /^(http(s?)\:\/\/){1}\S+$/ }
});

mongoose.model('Remote', RemoteSchema);

//User Model
var UserSchema = exports.UserSchema = new Schema({
    
});

mongoose.model('User', UserSchema);
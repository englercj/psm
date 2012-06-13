var mongoose = require('mongoose'),
mongooseAuth = require('mongoose-auth'),
Schema = mongoose.Schema,
ObjectId = Schema.ObjectId;

//Server Model
var BackupSchema = new Schema({
    path: String,
    interval: String,
    enabled: Boolean
});

var ServerSchema = exports.Server = new Schema({
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
	server: BackupSchema,
	maps: BackupSchema,
	logs: BackupSchema
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
    worlds: [String],
    ramWorlds: [String]
});

mongoose.model('Server', ServerSchema);

//Remote Model
var RemoteSchema = exports.RemoteSchema = new Schema({
    uri: { type: String, match: /^(http(s?)\:\/\/){1}\S+$/ }
});

mongoose.model('Remote', RemoteSchema);

//User Model
var UserSchema = exports.User = new Schema({
    
});

mongoose.model('User', UserSchema);
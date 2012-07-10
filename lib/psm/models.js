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

//Config Model
var ConfigSchema = exports.ConfigSchema = new Schema({
    api: {
        enabled: { type: Boolean, default: true },
        host: { type: String, default: '0.0.0.0' },
        port: { type: Number, default: 9876 }
    },
    logging: {
        file: {
            level: { type: String, default: 'debug' },
            encoder: { type: String, default: 'json' },
            filename: { type: String, default: '/var/log/psm/psm.log' },
            maxsize: { type: Number, default: 52428800 },
            rotate: { type: Number, default: 10 }
        },
	files: {
	    cli: { type: String, default: '/var/log/psm/psm.log' },
	    manager: { type: String, default: '/var/log/psm/psmd.log' },
	    worker: { type: String, default: '/var/log/psm/psmd-worker-$#.log' }
	},
        cli: {
            level: { type: String, default: 'info' },
            encoder: { type: String, default: 'text' }
        }
    },
    pids: {
        manager: { type: String, default: '/var/run/psmd.pid' },
        worker: { type: String, default: '/var/run/psmd-worker-$#.pid' }
    },
    debug: { type: Boolean, default: false },
    token: { type: String }
});

mongoose.model('Config', ConfigSchema);

//User Model
/*var UserSchema = exports.UserSchema = new Schema({

  });

  mongoose.model('User', UserSchema);*/
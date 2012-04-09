Overview
========
Panther Server Manager is a node application designed to manage the game servers for PantherGames.

Installation
------------
To install the application clone the repository and `npm install`:

    git clone git://github.com/englercj/PSM.git psm
    cd psm
    npm install

Configuration
-------------
There are a couple configuration files in the psm directory, `config.json` holds application configurations, 
and `servers.json` is a list of servers to initialize with.

### Example `config.json`
{
    "logging": {
	"level": 2,
	"dir": "logs"
    }
}
#### `logging`
 - `level`: the level of file logging to perform: (Default: `1`)
   - -1 is no logging
   - 0 is errors only
   - 1 is errors and info messages
   - 2 is errors, info, and debug messages
 - `dir`: the directory relative to the psm directory to keep logfiles (Default: `logs`)

### Example `servers.json`
{
    "server-id": {
        "type": "server-type",
        "subType": "server-subtype",
        "aliases": ["server-id-alias", "..."],
        "name": "Server Name or Title",
        "paths": {
            "bin": "/path/to/bin",
            "logs": "/path/to/logging/dir",
            "backup": "/path/to/where/backups/should/be/stored"
        },
        "type-specific-opts": ""
        "...": "..."
    }
}
#### `server-id`: identifies the server to commands
 - `type`: server class (maps to class in lib/servers/`type`/`type`.js)
 - `subType`: optional subtype (maps to class in lib/servers/`type`/`subtype`.js)
 - `aliases`: aliases for commands to use in addition to `server-id`
 - `name`: string name to identify the server by
 - `paths`:
   - `bin`: absolute path to the bin or executable folder of the server
   - `logs`: absolute path to the log folder of the server
   - `backup`: absolute path to where backups should be made
 - `type-specific-opts`: some types have specific options, they would go here and beyond

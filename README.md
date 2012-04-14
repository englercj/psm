## v0.1.1 Beta, expect bugs

Overview
========
Panther Server Manager is a node application designed to manage the game servers for PantherGames. The Manager
provides a way to include custom server modules for managing different kinds of servers.

Initial development will center around managing Minecraft Servers, then will branch into Source Dedicated Servers.

Installation
------------
To install the application clone the repository and `npm install`:

    git clone git://github.com/englercj/PSM.git psm
    cd psm
    npm install

Configuration
-------------
There are a couple configuration files in the `psm/config` directory, `config.json` holds the
main application configuration, `servers.json` is a list of servers to manage.

### Example `config.json`

	{
		"logging": {
			"level": 2,
			"dir": "logs"
		},
		"colors": {
			"startMessage": "green",
			"typeHelpMessage": "yellow",
			"promptText": "cyan",
			"prompt": "green",
			"helpCmd": "magenta",
			"helpDash": "grey",
			"helpMan": "white",
			"helpUsage": "green",
			"P": "red",
			"S": "white",
			"M": "blue"
		},
		"promptText": "psm",
		"prompt": "> ",
		"api": {
			 "ip": "127.0.0.1",
			 "port": 8596
		}
	}

`logging`

 - `level`: the level of file logging to perform
  - -1 = no logging, 
  - 0 = errors only, 
  - 1 = errors and info, 
  - 2 = errors, info, and debug
 - `dir`: the directory relative to the psm directory to keep logfiles

`colors`

 - misc colors for parts of the CLI

`promptText`: Text to place before the prompt

`prompt`: Actual prompt

`api`

 - `ip`: IP for the API to bind to, use `0.0.0.0` for all
 - `port`: Port for the API to bind to

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

`server-id`: identifies the server to commands

 - `type`: server class (maps to class in lib/servers/`type`/`type`.js)
 - `subType`: optional subtype (maps to class in lib/servers/`type`/`subtype`.js)
 - `aliases`: aliases for commands to use in addition to `server-id`
 - `name`: string name to identify the server by
 - `paths`:
  - `bin`: absolute path to the bin or executable folder of the server
  - `logs`: absolute path to the log folder of the server
  - `backup`: absolute path to where backups should be made
 - `type-specific-opts`: some types have specific options, they would go here and beyond